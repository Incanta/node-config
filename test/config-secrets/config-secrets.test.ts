import { describe, expect, test } from "@jest/globals";
import Config from "../../src/config";
import path from "path";

describe.skip("Config with secrets", () => {
  describe("with default secrets provider", () => {
    const config = new Config({
      configDir: path.join(__dirname),
      configEnv: "default",
    });

    test("does nothing to the value of the secret", async () => {
      expect(await config.getWithSecrets<string>("hello")).toBe(
        "secret|mysecret"
      );
    });
  });

  describe("with Vault", () => {
    describe("with vault v1 secrets provider", () => {
      process.env["VAULT_ROLE_ID"] = "TODO";
      process.env["VAULT_SECRET_ID"] = "TODO";
      const config = new Config({
        configDir: path.join(__dirname),
        configEnv: "vault-v1",
      });

      test("reads the secret", async () => {
        expect(await config.getWithSecrets<string>("hello")).toBe("mysecretv1");
      });
    });

    describe("with vault v2 secrets provider", () => {
      process.env["VAULT_ROLE_ID"] = "TODO";
      process.env["VAULT_SECRET_ID"] = "TODO";
      const config = new Config({
        configDir: path.join(__dirname),
        configEnv: "vault-v2",
      });

      test("reads the secret", async () => {
        expect(await config.getWithSecrets<string>("hello")).toBe("mysecretv2");
      });
    });
  });

  describe("with AWS Secrets Manager", () => {
    process.env["AWS_ACCESS_KEY_ID"] = "TODO";
    process.env["AWS_SECRET_ACCESS_KEY"] = "TODO";

    const config = new Config({
      configDir: path.join(__dirname),
      configEnv: "aws-secrets-manager",
    });

    test("reads the secret", async () => {
      expect(await config.getWithSecrets<string>("hello")).toBe("awssecret");
    });
  });

  describe("with Azure Key Vault", () => {
    process.env["AZURE_TENANT_ID"] = "TODO";
    process.env["AZURE_CLIENT_ID"] = "TODO";
    process.env["AZURE_CLIENT_SECRET"] = "TODO";

    const config = new Config({
      configDir: path.join(__dirname),
      configEnv: "azure-key-vault",
    });

    test("reads the secret", async () => {
      expect(await config.getWithSecrets<string>("hello")).toBe("azuresecret");
    });
  });

  describe("with GCP Secret Manager", () => {
    const config = new Config({
      configDir: path.join(__dirname),
      configEnv: "gcp-secret-manager",
    });

    test("reads the secret", async () => {
      expect(await config.getWithSecrets<string>("hello")).toBe("gcpsecret");
    });
  });

  describe("with local file", () => {
    const config = new Config({
      configDir: path.join(__dirname),
      configEnv: "local",
    });

    test("reads the secret", async () => {
      expect(await config.getWithSecrets<string>("hello")).toBe("localsecret");
    });
  });
});
