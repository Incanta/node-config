import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { ISecretsProvider, ISecretsToken } from "./provider";
import Config from "../config";

export class AwsSecretsManagerSecretsProvider implements ISecretsProvider {
  public async getAuthToken(config: Config): Promise<ISecretsToken> {
    return {
      value: "", // auth happens automatically with AWS SDK
      expires: new Date(Date.now() + 3600 * 1000),
    };
  }

  public async getSecret(
    config: Config,
    token: string,
    name: string
  ): Promise<string> {
    const region = config.get<string>("secrets.aws-kms.region");

    const client = new SecretsManagerClient({
      region,
    });

    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: name,
        VersionStage: "AWSCURRENT",
      })
    );

    if (!response.SecretString) {
      throw new Error(`No secret found with name: ${name}`);
    }

    return response.SecretString;
  }
}
