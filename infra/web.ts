import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export function createWebDeployment(
    config: pulumi.Config,
    namespace: pulumi.Output<string>,
    provider: k8s.Provider
) {
    const webImage = config.require("webImage");
    const replicas = config.getNumber("webReplicas") ?? 1;

    const deployment = new k8s.apps.v1.Deployment(
        "web-deployment",
        {
            metadata: {
                name: "web",
                namespace,
                labels: { app: "web" },
                annotations: { "pulumi.com/patchForce": "true" },
            },
            spec: {
                replicas,
                selector: { matchLabels: { app: "web" } },
                template: {
                    metadata: { labels: { app: "web" } },
                    spec: {
                        containers: [
                            {
                                name: "web",
                                image: webImage,
                                ports: [{ containerPort: 80 }],
                                resources: {
                                    requests: { cpu: "50m", memory: "64Mi" },
                                    limits: { cpu: "200m", memory: "128Mi" },
                                },
                                livenessProbe: {
                                    httpGet: { path: "/", port: 80 },
                                    initialDelaySeconds: 10,
                                    periodSeconds: 15,
                                    timeoutSeconds: 3,
                                    failureThreshold: 3,
                                },
                                readinessProbe: {
                                    httpGet: { path: "/", port: 80 },
                                    initialDelaySeconds: 5,
                                    periodSeconds: 5,
                                    timeoutSeconds: 3,
                                    failureThreshold: 3,
                                },
                            },
                        ],
                    },
                },
            },
        },
        { provider }
    );

    const service = new k8s.core.v1.Service(
        "web-service",
        {
            metadata: { name: "web", namespace, labels: { app: "web" } },
            spec: {
                type: "ClusterIP",
                selector: { app: "web" },
                ports: [{ port: 80, targetPort: 80, name: "http" }],
            },
        },
        { provider }
    );

    return { deployment, service };
}
