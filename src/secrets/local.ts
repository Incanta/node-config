import { ISecretsProvider, ISecretsToken } from "./provider";
import Config from "../config";
import { existsSync, promises as fs } from "fs";
import path from "path";

export class LocalSecretsProvider implements ISecretsProvider {
  public async getAuthToken(config: Config): Promise<ISecretsToken> {
    return {
      value: "", // there is no auth token for local secrets
      expires: new Date(Date.now() + 3600 * 1000),
    };
  }

  public async getSecret(
    config: Config,
    token: string,
    name: string
  ): Promise<string> {
    let filePath = config.tryGet<string>("secrets.local.file-path");

    if (filePath === null) {
      filePath = ".secrets";
    }

    const absolutePath = path.resolve(process.cwd(), filePath);

    if (existsSync(absolutePath) === false) {
      throw new Error(`Secrets file does not exist: ${absolutePath}`);
    }

    const contents = await fs.readFile(absolutePath, "utf8");

    const secretLines = contents.replace(/\r\n/g, "\n").split("\n");

    const secretMap: Record<string, string> = {};
    for (const line of secretLines) {
      const [key, value] = line.split("=");
      if (key && value) {
        secretMap[key.trim()] = value.trim();
      }
    }

    if (Object.keys(secretMap).length === 0) {
      throw new Error(`No secrets found in file: ${filePath}`);
    }

    if (!secretMap[name]) {
      throw new Error(`No secret found with name: ${name}`);
    }

    return secretMap[name];
  }
}
