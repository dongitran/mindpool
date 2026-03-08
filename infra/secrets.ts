import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export function createSecrets(
    config: pulumi.Config,
    namespace: pulumi.Output<string>,
    provider: k8s.Provider
) {
    const mongodbUrl = config.requireSecret("mongodbUrl");
    const redisUrl = config.requireSecret("redisUrl");
    const kimiApiKey = config.requireSecret("kimiApiKey");
    const minimaxApiKey = config.requireSecret("minimaxApiKey");

    return new k8s.core.v1.Secret(
        "mindpool-secret",
        {
            metadata: { name: "mindpool-secret", namespace },
            stringData: {
                MONGO_URI: mongodbUrl,
                REDIS_URL: redisUrl,
                KIMI_API_KEY: kimiApiKey,
                MINIMAX_API_KEY: minimaxApiKey,
            },
        },
        { provider }
    );
}
