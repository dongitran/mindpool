import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createNamespace } from "./namespace";
import { createSecrets } from "./secrets";
import { createApiDeployment } from "./api";
import { createWebDeployment } from "./web";
import { createIngress } from "./ingress";

const config = new pulumi.Config();

// Stack Reference — pull kubeconfig from gcp-infra
const infraStackRef = config.require("infraStackRef");
const infraStack = new pulumi.StackReference(infraStackRef);
const kubeconfig = infraStack.requireOutput("kubeconfigOutput") as pulumi.Output<string>;

const k8sProvider = new k8s.Provider("gke-k8s", { kubeconfig });

// ─── Build infrastructure ────────────────────────────────────
const namespace = createNamespace(k8sProvider);
const ns = namespace.metadata.name;

const secret = createSecrets(config, ns, k8sProvider);

const { deployment: apiDeployment, service: apiService } =
    createApiDeployment(config, ns, secret, k8sProvider);

const { deployment: webDeployment, service: webService } =
    createWebDeployment(config, ns, k8sProvider);

const ingress = createIngress(config, ns, apiService, webService, k8sProvider);

// ─── Exports ─────────────────────────────────────────────────
export const namespaceName = ns;
export const apiServiceName = apiService.metadata.name;
export const webServiceName = webService.metadata.name;
export const ingressName = ingress.metadata.name;
