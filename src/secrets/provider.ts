import Config from "../config";

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

export async function GetSecretsProvider(
  provider: SecretsProviderType
): Promise<ISecretsProvider> {
  switch (provider) {
    case SecretsProviderType.HcpVault:
      throw new Error(
        `Hashicorp's managed HCP Vault has been discontinued; please use another secrets provider\n\nhttps://developer.hashicorp.com/hcp/docs/vault-secrets/end-of-sale-announcement\n`
      );
    case SecretsProviderType.Vault: {
      const { VaultSecretsProvider } = await import("./vault");
      return new VaultSecretsProvider();
    }
    case SecretsProviderType.AwsSecretsManager: {
      const { AwsSecretsManagerSecretsProvider } = await import(
        "./aws-secrets-manager"
      );
      return new AwsSecretsManagerSecretsProvider();
    }
    case SecretsProviderType.AzureKeyVault: {
      const { AzureKeyVaultSecretsProvider } = await import(
        "./azure-key-vault"
      );
      return new AzureKeyVaultSecretsProvider();
    }
    case SecretsProviderType.GcpSecretManager: {
      const { GcpSecretManagerSecretsProvider } = await import(
        "./gcp-secret-manager"
      );
      return new GcpSecretManagerSecretsProvider();
    }
    case SecretsProviderType.Local: {
      const { LocalSecretsProvider } = await import("./local");
      return new LocalSecretsProvider();
    }
    default:
      throw new Error(`Unknown secrets provider: ${provider}`);
  }
}
