import merge from "lodash.merge";
import path from "path";
import fs from "fs";
import { Loader } from "./loader";

export interface IConfigOptions {
  configDir?: string;
  configEnv?: string;
}

export class Config {
  private configDir: string;

  private values: any;
  private customValues: any;

  public constructor(options?: IConfigOptions) {
    this.values = {};
    this.customValues = {};

    this.configDir = options?.configDir || path.join(process.cwd(), "config");

    const defaultValues = Loader.load(path.join(this.configDir, "default"));

    let envValues: any = {};
    const configEnvDir =
      options?.configEnv ||
      process.env["NODE_CONFIG_ENV"] ||
      process.env["NODE_ENV"];
    if (configEnvDir) {
      if (fs.existsSync(path.join(this.configDir, configEnvDir))) {
        envValues = Loader.load(path.join(this.configDir, configEnvDir));
      } else {
        console.log(
          `Cannot use environment deployment value of ${configEnvDir} because ${path.join(
            this.configDir,
            configEnvDir
          )} doesn't exist`
        );
      }
    }

    const localValues = Loader.load(path.join(this.configDir, "local"));

    const overrideValues = Loader.loadFile(
      path.join(this.configDir, "override.json")
    );

    merge(this.values, defaultValues, envValues, localValues, overrideValues);
  }

  public get<T>(key: string): T {
    const parts = key.split(".");
    return this.getWithParts<T>(parts);
  }

  public getWithParts<T>(keyParts: string[]): T {
    if (keyParts.length === 0) {
      throw new Error("Cannot use an empty key");
    }

    let obj = this.values;

    for (const part of keyParts) {
      if (typeof obj[part] === "undefined") {
        throw new Error(`Could not find value for key ${keyParts.join(".")}`);
      }

      obj = obj[part];
    }

    return obj as T;
  }

  public has(key: string): boolean {
    try {
      this.get(key);
    } catch {
      return false;
    }

    return true;
  }

  public set<T>(key: string, value: T): void {
    const parts = key.split(".");
    this.setWithParts<T>(parts, value);
  }

  public setWithParts<T>(keyParts: string[], value: T): void {
    if (keyParts.length === 0) {
      throw new Error("Cannot use an empty key");
    }

    const obj: any = {};
    for (let i = 0; i < keyParts.length - 1; i++) {
      obj[keyParts[i]] = {};
    }

    obj[keyParts[keyParts.length - 1]] = value;

    merge(this.customValues, obj);
  }

  public async save(): Promise<void> {
    const fileContents = JSON.stringify(this.customValues, null, 2);
    await fs.promises.writeFile(this.configDir, fileContents, {
      encoding: "utf-8",
    });
  }
}
