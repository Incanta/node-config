import Config from "../config";
import { HcpVaultSecretsProvider } from "./hcp-vault";

export enum SecretsProviderType {
  HcpVault = "hcp-vault",
  None = "none",
}

export interface ISecretsToken {
  value: string;
  expires: Date;
}

export interface ISecretsProvider {
  getAuthToken(): Promise<ISecretsToken>;
  getSecrets(config: Config, token: string): Promise<Record<string, string>>;
  getSecret(config: Config, token: string, secretName: string): Promise<string>;
}

export function GetSecretsProvider(
  provider: SecretsProviderType
): ISecretsProvider {
  switch (provider) {
    case SecretsProviderType.HcpVault:
      return new HcpVaultSecretsProvider();
    default:
      throw new Error(`Unknown secrets provider: ${provider}`);
  }
}
