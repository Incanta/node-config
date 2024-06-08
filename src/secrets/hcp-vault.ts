import axios, { AxiosError } from "axios";
import Config from "../config";
import { ISecretsProvider, ISecretsToken } from "./provider";

export interface IHcpVaultSecret {
  name: string;
  version: {
    version: string;
    type: string;
    created_at: string;
    value: string;
    created_by: {
      name: string;
      type: string;
      email: string;
    };
  };
  created_at: string;
  latest_version: string;
  created_by: {
    name: string;
    type: string;
    email: string;
  };
  sync_status: any;
}

export class HcpVaultSecretsProvider implements ISecretsProvider {
  public async getAuthToken(): Promise<ISecretsToken> {
    try {
      const response = await axios.post(
        "https://auth.idp.hashicorp.com/oauth2/token",
        {
          client_id: process.env.HCP_CLIENT_ID,
          client_secret: process.env.HCP_CLIENT_SECRET,
          grant_type: "client_credentials",
          audience: "https://api.hashicorp.cloud",
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      return {
        value: response.data.access_token,
        expires: new Date(Date.now() + response.data.expires_in * 1000),
      };
    } catch (error: any) {
      const typedError = error as AxiosError;
      throw new Error(
        `Failed to get HCP Vault token: ${typedError.code}; did you set HCP_CLIENT_ID and HCP_CLIENT_SECRET?`
      );
    }
  }

  public async getSecrets(
    config: Config,
    token: string
  ): Promise<Record<string, string>> {
    const orgId = config.get<string>("secrets.hcp-vault.organization-id");
    const projectId = config.get<string>("secrets.hcp-vault.project-id");
    const appName = config.get<string>("secrets.hcp-vault.app-name");
    const response = await axios.get(
      `https://api.cloud.hashicorp.com/secrets/2023-06-13/organizations/${orgId}/projects/${projectId}/apps/${appName}/open`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const secrets: Record<string, string> = {};
    for (const secret of response.data.secrets as IHcpVaultSecret[]) {
      secrets[secret.name] = secret.version.value;
    }

    return secrets;
  }

  public async getSecret(
    config: Config,
    token: string,
    secretName: string
  ): Promise<string> {
    const orgId = config.get<string>("secrets.hcp-vault.organization-id");
    const projectId = config.get<string>("secrets.hcp-vault.project-id");
    const appName = config.get<string>("secrets.hcp-vault.app-name");
    const response = await axios.get(
      `https://api.cloud.hashicorp.com/secrets/2023-06-13/organizations/${orgId}/projects/${projectId}/apps/${appName}/open/${secretName}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return (response.data.secret as IHcpVaultSecret).version.value;
  }
}
