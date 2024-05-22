import merge from "lodash.merge";
import path from "path";
import fs from "fs";
import { Loader } from "./loader";

export interface IConfigOptions {
  configDir?: string;
  configEnv?: string;
}

export default class Config {
  private configDir: string = "";

  private values: any;
  private normalizedValues: any;
  private customValues: any;

  private envVarConfig: any;

  public constructor(options?: IConfigOptions) {
    this.init(options);
  }

  public init(options?: IConfigOptions): void {
    this.values = {};
    this.normalizedValues = {};
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

    const configEnvDir =
      options?.configEnv || process.env["NODE_CONFIG_ENV"] || defaultConfigEnv;

    const configFolderOptions = Loader.readConfigSettings(
      path.join(this.configDir, configEnvDir)
    );

    const defaultValues = Loader.loadRoot(
      path.join(this.configDir, "default"),
      {
        ...configFolderOptions,
        parentNames: [],
      }
    );

    let envValues: any = {};
    if (configEnvDir) {
      if (fs.existsSync(path.join(this.configDir, configEnvDir))) {
        envValues = Loader.loadRoot(
          path.join(this.configDir, configEnvDir),
          configFolderOptions
        );
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
      path.join(this.configDir, "override.json"),
      {}
    );

    merge(this.values, defaultValues, envValues, overrideValues);
    this.normalizedValues = this.normalizeObject(this.values, []);

    // load the environment variables that are configured to be injected
    // using config-env
    const dirContents = fs.readdirSync(this.configDir, { encoding: "utf-8" });
    this.envVarConfig = {};
    for (const file of dirContents) {
      if (file.startsWith("environment.")) {
        this.envVarConfig = Loader.loadFile(
          path.join(this.configDir, file),
          {}
        );
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

    let obj = merge({}, this.normalizedValues);

    for (const part of keyParts) {
      // convert to camelCase first
      const newPart = part.replace(/-([a-zA-Z0-9])/g, function (_, match) {
        return match.toUpperCase();
      });

      if (typeof obj[newPart] === "undefined") {
        throw new Error(`Could not find value for key ${keyParts.join(".")}`);
      }

      obj = obj[newPart];
    }

    return obj as T;
  }

  public normalizeString(value: string, currentPath: string[]): string {
    let result = value;

    const variableRegex = /\$\{[a-zA-Z\-_0-9./]+\}/g;
    const regexResult = value.matchAll(variableRegex);
    for (const match of regexResult) {
      const key = match[0].slice(2, match[0].length - 1);

      let keyToFetchValue: string;
      if (key.startsWith(".")) {
        keyToFetchValue = path
          .normalize(`${currentPath.join("/")}/${key}`)
          .replaceAll("\\", "/")
          .replaceAll("/", ".");
      } else {
        keyToFetchValue = key;
      }

      let obj = merge({}, this.values);

      const keyParts = keyToFetchValue.split(".");
      for (const part of keyParts) {
        // convert to camelCase first
        const newPart = part.replace(/-([a-zA-Z0-9])/g, function (_, match) {
          return match.toUpperCase();
        });

        if (typeof obj[newPart] === "undefined") {
          throw new Error(`Could not find value for key ${keyParts.join(".")}`);
        }

        obj = obj[newPart];
      }

      if (obj !== null) {
        if (typeof obj === "string" && obj.match(variableRegex) !== null) {
          obj = this.normalizeString(obj, keyParts.slice(0, -1));
        }

        result = result.replace(match[0], `${obj}`);
      }
    }

    return result;
  }

  public normalizeObject(obj: any, currentPath: string[]): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    const newObj = merge({}, obj);

    for (const property of Object.keys(newObj)) {
      const value = newObj[property];
      if (typeof value === "string") {
        newObj[property] = this.normalizeString(value, currentPath);
      } else if (typeof value === "object") {
        if (value === null) {
          newObj[property] = null;
        } else if (Array.isArray(value)) {
          continue;
        } else {
          newObj[property] = this.normalizeObject(value, [
            ...currentPath,
            property,
          ]);
        }
      }
    }

    return newObj;
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
    const values = merge({}, this.normalizedValues);

    return values;
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
