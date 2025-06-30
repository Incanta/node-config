import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";
import { ISecretsProvider, ISecretsToken } from "./provider";
import Config from "../config";

export class AzureKeyVaultSecretsProvider implements ISecretsProvider {
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
    // DefaultAzureCredential expects the following three environment variables:
    // - AZURE_TENANT_ID: The tenant ID in Azure Active Directory
    // - AZURE_CLIENT_ID: The application (client) ID registered in the AAD tenant
    // - AZURE_CLIENT_SECRET: The client secret for the registered application
    const credential = new DefaultAzureCredential();

    const endpoint = config.get<string>("secrets.azure-key-vault.endpoint");

    const client = new SecretClient(endpoint, credential);

    const secret = await client.getSecret(name);

    return secret.value || "";
  }
}
