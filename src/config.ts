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

  private envVarConfig: any;

  public constructor(options?: IConfigOptions) {
    this.values = {};
    this.customValues = {};

    let defaultConfigDir = "config";
    let defaultConfigEnv = "default";
    if (fs.existsSync(path.join(process.cwd(), "config-settings.json"))) {
      const configSettings = JSON.parse(
        fs.readFileSync(
          path.join(process.cwd(), "config-settings.json"),
          "utf-8"
        )
      );

      if (configSettings.defaults) {
        if (configSettings.defaults.dir) {
          defaultConfigDir = configSettings.defaults.dir;
        }

        if (configSettings.defaults.env) {
          defaultConfigEnv = configSettings.defaults.env;
        }
      }
    }

    this.configDir =
      options?.configDir ||
      (process.env["NODE_CONFIG_DIR"] &&
        path.relative(process.cwd(), process.env["NODE_CONFIG_DIR"])) ||
      path.join(process.cwd(), defaultConfigDir);

    const defaultValues = Loader.load(path.join(this.configDir, "default"));

    let envValues: any = {};
    const configEnvDir =
      options?.configEnv || process.env["NODE_CONFIG_ENV"] || defaultConfigEnv;
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

    const overrideValues = Loader.loadFile(
      path.join(this.configDir, "override.json")
    );

    merge(this.values, defaultValues, envValues, overrideValues);

    // load the environment variables that are configured to be injected
    // using config-env
    const dirContents = fs.readdirSync(this.configDir, { encoding: "utf-8" });
    this.envVarConfig = {};
    for (const file of dirContents) {
      if (file.startsWith("environment.")) {
        this.envVarConfig = Loader.loadFile(path.join(this.configDir, file));
        break;
      }
    }
  }

  public dir(): string {
    return this.configDir;
  }

  public getConfiguredEnv(): any {
    const extraEnv: any = {};
    const envKeys = Object.keys(this.envVarConfig);

    for (const key of envKeys) {
      const configKey = this.envVarConfig[key];

      const envValue = this.get<any>(configKey);

      extraEnv[key] = `${envValue}`;
    }

    return extraEnv;
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

    const variableRegex = /\$\{[a-zA-Z\-_0-9./]+\}/g;

    const replaceValue = (value: string): string => {
      const regexResult = value.matchAll(variableRegex);
      let result = value;

      for (const match of regexResult) {
        let keyToReplace = match[0].slice(2, match[0].length - 1);
        if (keyToReplace.startsWith("./")) {
          // convert relative path to absolute path
          keyToReplace = `${keyParts
            .slice(0, keyParts.length - 1)
            .join(".")}.${keyToReplace.slice(2)}`;
        }
        const newValue = this.tryGet<string | number | boolean>(keyToReplace);
        if (newValue !== null) {
          result = result.replace(match[0], `${newValue}`);
        }
      }

      return result;
    };

    // replace all ${value} with the value from the config
    if (typeof obj === "string") {
      obj = replaceValue(obj);
    } else if (typeof obj === "object") {
      // walk the object and replace all strings with the value from the config
      const walkObject = (curObj: any): void => {
        for (const property of Object.keys(curObj)) {
          const value = curObj[property];
          if (typeof value === "string") {
            curObj[property] = replaceValue(value);
          } else if (typeof value === "object") {
            if (value === null) {
              curObj[property] = null;
            } else {
              walkObject(value);
            }
          }
        }
      };

      if (obj !== null) {
        walkObject(obj);
      }
    }

    return obj as T;
  }

  public tryGet<T>(key: string): T | null {
    try {
      const value = this.get<T>(key);
      return value;
    } catch {
      return null;
    }
  }

  public getJson(): any {
    return this.values;
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
