import axios from "axios";
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

    const response = await axios.post(
      `${endpoint}/v1/auth/approle/login`,
      {
        role_id: process.env.VAULT_ROLE_ID,
        secret_id: process.env.VAULT_SECRET_ID,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Vault-Namespace": namespace,
        },
      }
    );

    return {
      value: response.data.auth.client_token,
      expires: new Date(Date.now() + response.data.auth.lease_duration * 1000),
    };
  }

  public async getSecret(
    config: Config,
    token: string,
    name: string
  ): Promise<string> {
    const kvEngine = config.get<VaultKvEngine>("secrets.vault.kv-engine");
    const engineName = config.get<string>("secrets.vault.engine-name");

    if (kvEngine === VaultKvEngine.V1) {
      const response = await axios.get(
        `${config.get<string>(
          "secrets.vault.endpoint"
        )}/v1/${engineName}/${name}`,
        {
          headers: {
            "X-Vault-Token": token,
            "X-Vault-Namespace": config.get<string>("secrets.vault.namespace"),
          },
        }
      );

      if (!response.data.data) {
        throw new Error(`No data found at path: ${name}`);
      }

      if (!response.data.data.value) {
        throw new Error(
          `No key with name 'value' found in secret key/value at path: ${name}`
        );
      }

      return response.data.data.value;
    } else if (kvEngine === VaultKvEngine.V2) {
      const response = await axios.get(
        `${config.get<string>(
          "secrets.vault.endpoint"
        )}/v1/${engineName}/data/${name}`,
        {
          headers: {
            "X-Vault-Token": token,
            "X-Vault-Namespace": config.get<string>("secrets.vault.namespace"),
          },
        }
      );

      if (!response.data.data || !response.data.data.data) {
        throw new Error(`No data found at path: ${name}`);
      }

      if (!response.data.data.data.value) {
        throw new Error(
          `No key with name 'value' found in secret key/value at path: ${name}`
        );
      }

      return response.data.data.data.value;
    } else {
      throw new Error(`Unsupported Vault KV engine: ${kvEngine}`);
    }
  }
}
