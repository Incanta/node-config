import Config from "../config";
import { VaultSecretsProvider } from "./vault";
import { AwsSecretsManagerSecretsProvider } from "./aws-secrets-manager";
import { AzureKeyVaultSecretsProvider } from "./azure-key-vault";
import { GcpSecretManagerSecretsProvider } from "./gcp-secret-manager";
import { LocalSecretsProvider } from "./local";

export enum SecretsProviderType {
  HcpVault = "hcp-vault",
  Vault = "vault",
  AwsSecretsManager = "aws-secrets-manager",
  AzureKeyVault = "azure-key-vault",
  GcpSecretManager = "gcp-secret-manager",
  Local = "local",
  None = "none",
}

export interface ISecretsToken {
  value: string;
  expires: Date;
}

export interface ISecretsProvider {
  getAuthToken(config: Config): Promise<ISecretsToken>;
  getSecret(config: Config, token: string, name: string): Promise<string>;
}

export function GetSecretsProvider(
  provider: SecretsProviderType
): ISecretsProvider {
  switch (provider) {
    case SecretsProviderType.HcpVault:
      throw new Error(
        `Hashicorp's managed HCP Vault has been discontinued; please use another secrets provider\n\nhttps://developer.hashicorp.com/hcp/docs/vault-secrets/end-of-sale-announcement\n`
      );
    case SecretsProviderType.Vault:
      return new VaultSecretsProvider();
    case SecretsProviderType.AwsSecretsManager:
      return new AwsSecretsManagerSecretsProvider();
    case SecretsProviderType.AzureKeyVault:
      return new AzureKeyVaultSecretsProvider();
    case SecretsProviderType.GcpSecretManager:
      return new GcpSecretManagerSecretsProvider();
    case SecretsProviderType.Local:
      return new LocalSecretsProvider();
    default:
      throw new Error(`Unknown secrets provider: ${provider}`);
  }
}
