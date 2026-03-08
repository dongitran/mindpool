import * as k8s from "@pulumi/kubernetes";

export function createNamespace(provider: k8s.Provider) {
    return new k8s.core.v1.Namespace(
        "mindpool-namespace",
        { metadata: { name: "mindpool" } },
        { provider }
    );
}
