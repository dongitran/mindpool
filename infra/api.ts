import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export function createApiDeployment(
    config: pulumi.Config,
    namespace: pulumi.Output<string>,
    secret: k8s.core.v1.Secret,
    provider: k8s.Provider
) {
    const apiImage = config.require("apiImage");
    const replicas = config.getNumber("apiReplicas") ?? 1;

    const deployment = new k8s.apps.v1.Deployment(
        "api-deployment",
        {
            metadata: {
                name: "api",
                namespace,
                labels: { app: "api" },
                annotations: { "pulumi.com/patchForce": "true" },
            },
            spec: {
                replicas,
                selector: { matchLabels: { app: "api" } },
                template: {
                    metadata: { labels: { app: "api" } },
                    spec: {
                        containers: [
                            {
                                name: "api",
                                image: apiImage,
                                ports: [{ containerPort: 3001 }],
                                envFrom: [{ secretRef: { name: secret.metadata.name } }],
                                env: [
                                    { name: "NODE_ENV", value: "production" },
                                    { name: "PORT", value: "3001" },
                                    { name: "LLM_FULL_RESPONSE_PROVIDER", value: config.get("llmFullResponseProvider") ?? "kimi" },
                                    { name: "LLM_FULL_RESPONSE_MODEL", value: config.get("llmFullResponseModel") ?? "kimi-k2.5" },
                                    { name: "LLM_RELEVANCE_CHECK_PROVIDER", value: config.get("llmRelevanceCheckProvider") ?? "kimi" },
                                    { name: "LLM_RELEVANCE_CHECK_MODEL", value: config.get("llmRelevanceCheckModel") ?? "kimi-k2.5" },
                                    { name: "LLM_RECAP_SYNTHESIS_PROVIDER", value: config.get("llmRecapSynthesisProvider") ?? "kimi" },
                                    { name: "LLM_RECAP_SYNTHESIS_MODEL", value: config.get("llmRecapSynthesisModel") ?? "kimi-k2.5" },
                                    { name: "MINDPOOL_HOST", value: config.require("host") },
                                ],
                                resources: {
                                    requests: { cpu: "100m", memory: "256Mi" },
                                    limits: { cpu: "500m", memory: "512Mi" },
                                },
                                livenessProbe: {
                                    httpGet: { path: "/health", port: 3001 },
                                    initialDelaySeconds: 30,
                                    periodSeconds: 15,
                                    timeoutSeconds: 5,
                                    failureThreshold: 3,
                                },
                                readinessProbe: {
                                    httpGet: { path: "/health", port: 3001 },
                                    initialDelaySeconds: 10,
                                    periodSeconds: 5,
                                    timeoutSeconds: 5,
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
        "api-service",
        {
            metadata: { name: "api", namespace, labels: { app: "api" } },
            spec: {
                type: "ClusterIP",
                selector: { app: "api" },
                ports: [{ port: 3001, targetPort: 3001, name: "http" }],
            },
        },
        { provider }
    );

    return { deployment, service };
}
