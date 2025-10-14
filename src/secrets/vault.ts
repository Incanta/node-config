import Config from "../config";
import { ISecretsProvider, ISecretsToken } from "./provider";

enum VaultKvEngine {
  V1 = "v1",
  V2 = "v2",
}

export class VaultSecretsProvider implements ISecretsProvider {
  public async getAuthToken(config: Config): Promise<ISecretsToken> {
    const endpoint = config.get<string>("secrets.vault.endpoint");
    const namespace = config.get<string>("secrets.vault.namespace");

    const response = await fetch(`${endpoint}/v1/auth/approle/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Vault-Namespace": namespace,
      },
      body: JSON.stringify({
        role_id: process.env.VAULT_ROLE_ID,
        secret_id: process.env.VAULT_SECRET_ID,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(
        `Failed to authenticate with Vault: ${
          responseData.errors?.join(", ") || response.statusText
        }`
      );
    }

    return {
      value: responseData.auth.client_token,
      expires: new Date(Date.now() + responseData.auth.lease_duration * 1000),
    };
  }

  public async getSecret(
    config: Config,
    token: string,
    name: string
  ): Promise<string> {
    const kvEngine = config.get<VaultKvEngine>("secrets.vault.kv-engine");
    const engineName = config.get<string>("secrets.vault.engine-name");
    const pathPrefix = config.get<string>("secrets.vault.path-prefix");

    if (kvEngine === VaultKvEngine.V1) {
      const response = await fetch(
        `${config.get<string>(
          "secrets.vault.endpoint"
        )}/v1/${engineName}/${pathPrefix}${name}`,
        {
          method: "GET",
          headers: {
            "X-Vault-Token": token,
            "X-Vault-Namespace": config.get<string>("secrets.vault.namespace"),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to retrieve secret: ${response.statusText}`);
      }

      const responseData = await response.json();

      if (!responseData.data) {
        throw new Error(`No data found at path: ${name}`);
      }

      if (!responseData.data.value) {
        throw new Error(
          `No key with name 'value' found in secret key/value at path: ${name}`
        );
      }

      return responseData.data.value;
    } else if (kvEngine === VaultKvEngine.V2) {
      const response = await fetch(
        `${config.get<string>(
          "secrets.vault.endpoint"
        )}/v1/${engineName}/data/${pathPrefix}${name}`,
        {
          method: "GET",
          headers: {
            "X-Vault-Token": token,
            "X-Vault-Namespace": config.get<string>("secrets.vault.namespace"),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to retrieve secret: ${response.statusText}`);
      }

      const responseData = await response.json();

      if (!responseData) {
        throw new Error(`No data found at path: ${name}`);
      }

      if (!responseData.data || !responseData.data.data) {
        throw new Error(`No data found at path: ${name}`);
      }

      if (!responseData.data.data.value) {
        throw new Error(
          `No key with name 'value' found in secret key/value at path: ${name}`
        );
      }

      return responseData.data.data.value;
    } else {
      throw new Error(`Unsupported Vault KV engine: ${kvEngine}`);
    }
  }
}
