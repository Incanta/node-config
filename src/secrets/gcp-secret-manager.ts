import { v1 } from "@google-cloud/secret-manager";
const { SecretManagerServiceClient } = v1;
import { ISecretsProvider, ISecretsToken } from "./provider";
import Config from "../config";
import path from "path";

export class GcpSecretManagerSecretsProvider implements ISecretsProvider {
  public async getAuthToken(config: Config): Promise<ISecretsToken> {
    return {
      value: "", // auth happens automatically with the Azure SDK
      expires: new Date(Date.now() + 3600 * 1000),
    };
  }

  public async getSecret(
    config: Config,
    token: string,
    name: string
  ): Promise<string> {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credentialsPath = path.resolve(
        process.cwd(),
        config.get<string>("secrets.gcp-secret-manager.credentials-file")
      );

      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    }

    const client = new SecretManagerServiceClient();

    const projectId = config.get<string>(
      "secrets.gcp-secret-manager.project-id"
    );

    const [secret] = await client.accessSecretVersion({
      name: `projects/${projectId}/secrets/${name}/versions/latest`,
    });

    if (!secret.payload || !secret.payload.data) {
      throw new Error(`No secret found with name: ${name}`);
    }

    return secret.payload.data.toString();
  }
}
