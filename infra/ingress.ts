import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export function createIngress(
    config: pulumi.Config,
    namespace: pulumi.Output<string>,
    apiService: k8s.core.v1.Service,
    webService: k8s.core.v1.Service,
    provider: k8s.Provider
) {
    const host = config.require("host");
    const tlsSecretName = host.replace(/\./g, "-") + "-tls";

    return new k8s.networking.v1.Ingress(
        "mindpool-ingress",
        {
            metadata: {
                name: "mindpool-ingress",
                namespace,
                annotations: {
                    "cert-manager.io/cluster-issuer": "letsencrypt-prod",
                    "nginx.ingress.kubernetes.io/ssl-redirect": "true",
                    // SSE (Server-Sent Events) — disable buffering, long timeouts
                    "nginx.ingress.kubernetes.io/proxy-buffering": "off",
                    "nginx.ingress.kubernetes.io/proxy-read-timeout": "3600",
                    "nginx.ingress.kubernetes.io/proxy-send-timeout": "3600",
                },
            },
            spec: {
                ingressClassName: "nginx",
                tls: [{ hosts: [host], secretName: tlsSecretName }],
                rules: [
                    {
                        host,
                        http: {
                            paths: [
                                // /api/* → API server (Express)
                                {
                                    path: "/api",
                                    pathType: "Prefix",
                                    backend: {
                                        service: {
                                            name: apiService.metadata.name,
                                            port: { number: 3001 },
                                        },
                                    },
                                },
                                // /stream/* → API server (SSE endpoints)
                                {
                                    path: "/stream",
                                    pathType: "Prefix",
                                    backend: {
                                        service: {
                                            name: apiService.metadata.name,
                                            port: { number: 3001 },
                                        },
                                    },
                                },
                                // Everything else → Web frontend (React)
                                {
                                    path: "/",
                                    pathType: "Prefix",
                                    backend: {
                                        service: {
                                            name: webService.metadata.name,
                                            port: { number: 80 },
                                        },
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
        { provider }
    );
}
