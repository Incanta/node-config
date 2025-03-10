import mergeWith from "lodash.mergewith";
import path from "path";
import fs from "fs";
import { Loader } from "./loader";
import { GetSecretsProvider, SecretsProviderType } from "./secrets/provider";
import { mergeWithCustomizer } from "./merge-customizer";

export interface IConfigOptions {
  configDir?: string;
  configEnv?: string;
  cwd?: string;
}

export interface IConfigSettings {
  defaults?: {
    dir?: string;
    env?: string;
  };
  extraDirs?: string[];
}

export default class Config {
  private configDir: string = "";
  private configEnv: string = "";
  private extraConfigDirs: string[] = [];

  private values: any;
  private normalizedValues: any;
  private customValues: any;

  private envVarConfig: any;

  private secretsToken: {
    value: string;
    expires: Date;
  } | null = null;
  private secretsCache: Record<string, any> = {};
  private secretsCacheExpiration: Date | null = null;

  public constructor(options?: IConfigOptions) {
    this.init(options);
  }

  public init(options?: IConfigOptions): void {
    this.values = {};
    this.normalizedValues = {};
    this.customValues = {};
    this.secretsToken = null;
    this.secretsCache = {};
    this.secretsCacheExpiration = null;

    let defaultConfigDir = "config";
    let defaultConfigEnv = "default";
    const cwd = options?.cwd || process.cwd();
    if (fs.existsSync(path.join(cwd, "config-settings.json"))) {
      const configSettings: IConfigSettings = JSON.parse(
        fs.readFileSync(path.join(cwd, "config-settings.json"), "utf-8")
      );

      if (configSettings.defaults) {
        if (configSettings.defaults.dir) {
          defaultConfigDir = configSettings.defaults.dir;
        }

        if (configSettings.defaults.env) {
          defaultConfigEnv = configSettings.defaults.env;
        }
      }

      if (configSettings.extraDirs && Array.isArray(configSettings.extraDirs)) {
        this.extraConfigDirs = configSettings.extraDirs;
      }
    }

    this.configDir =
      options?.configDir ||
      (process.env["NODE_CONFIG_DIR"] &&
        path.relative(cwd, process.env["NODE_CONFIG_DIR"])) ||
      path.join(cwd, defaultConfigDir);

    this.configEnv =
      options?.configEnv || process.env["NODE_CONFIG_ENV"] || defaultConfigEnv;

    const configEnvDir = this.configEnvDir(this.configEnv);

    const configFolderOptions = Loader.readConfigSettings(
      configEnvDir || path.join(this.configDir, "default")
    );

    const defaultValues = Loader.loadRoot(
      path.join(this.configDir, "default"),
      {
        ...configFolderOptions,
        parentNames: [],
      },
      this
    );

    let envValues: { data: any; loadedNames: string[] } = {
      data: {},
      loadedNames: [],
    };
    if (configEnvDir) {
      envValues = Loader.loadRoot(
        configEnvDir,
        {
          ...configFolderOptions,
          existingObj: defaultValues.data,
        },
        this
      );
    }

    const overrideValues = Loader.loadFile(
      path.join(this.configDir, "override.json"),
      {}
    );

    mergeWith(
      this.values,
      defaultValues.data,
      envValues.data,
      overrideValues,
      mergeWithCustomizer
    );

    this.values = Loader.convertKebabToCamelCase(
      this.values,
      configFolderOptions
    );

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

  public env(): string {
    return this.configEnv;
  }

  public configEnvDir(configEnv: string): string | null {
    if (fs.existsSync(path.join(this.configDir, configEnv))) {
      return path.join(this.configDir, configEnv);
    }

    for (const extraDir of this.extraConfigDirs) {
      if (fs.existsSync(path.join(extraDir, configEnv))) {
        return path.join(extraDir, configEnv);
      }
    }

    if (process.env["NODE_CONFIG_SKIP_ENV_WARNING"] !== "true") {
      console.error(
        `\nERROR: Cannot find config environment "${configEnv}" in ${
          this.configDir
        } or configured extra dirs: [${this.extraConfigDirs.join(
          ", "
        )}].\nThis error is for a **single environment folder**; ` +
          `if you see multiple folders listed in this error, you likely have a typo "parentNames" (i.e. ["parent 1, parent 2"] instead of ["parent 1", "parent 2"]).\n` +
          `We're continuing on with the default environment folder, but this is likely an error for you.\n`
      );
    }

    return null;
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

    let obj = mergeWith({}, this.normalizedValues, mergeWithCustomizer);

    for (const part of keyParts) {
      // convert to camelCase first
      const newPart = part.replace(/-([a-zA-Z0-9])/g, function (_, match) {
        return match.toUpperCase();
      });

      if (typeof obj[newPart] === "undefined" && obj[part] === undefined) {
        throw new Error(`Could not find value for key ${keyParts.join(".")}`);
      } else if (obj[newPart] === undefined && obj[part] !== undefined) {
        obj = obj[part];
      } else {
        obj = obj[newPart];
      }
    }

    return obj as T;
  }

  public async refreshSecrets(): Promise<void> {
    const provider = GetSecretsProvider(this.normalizedValues.secrets.provider);

    if (
      this.secretsToken === null ||
      this.secretsToken.expires.getTime() < Date.now() + 500
    ) {
      this.secretsToken = await provider.getAuthToken();
    }

    this.secretsCache = await provider.getSecrets(
      this,
      this.secretsToken.value
    );
    this.secretsCacheExpiration = new Date(
      Date.now() + this.get<number>("secrets.cache-duration-seconds") * 1000
    );
  }

  public async getWithSecrets<T>(key: string): Promise<T> {
    let value = this.get<T>(key);

    const provider = this.normalizedValues.secrets?.provider;
    if (typeof provider === "string" && provider !== SecretsProviderType.None) {
      value = await this.processSecrets(value);
    }

    return value;
  }

  public async processSecrets<T>(v: T): Promise<T> {
    if (
      typeof this.normalizedValues.secrets?.provider === "undefined" ||
      (typeof this.normalizedValues.secrets?.provider === "string" &&
        this.normalizedValues.secrets.provider === SecretsProviderType.None)
    ) {
      return v;
    }

    if (typeof v === "string" && v.startsWith("secret|")) {
      const secretKey = v.slice(7);

      const provider = GetSecretsProvider(
        this.normalizedValues.secrets.provider
      );

      if (
        this.secretsToken === null ||
        this.secretsToken.expires.getTime() < Date.now() + 500
      ) {
        this.secretsToken = await provider.getAuthToken();
      }

      if (
        this.secretsCacheExpiration === null ||
        this.secretsCacheExpiration < new Date() ||
        this.secretsCache[secretKey] === undefined
      ) {
        this.secretsCache = await provider.getSecrets(
          this,
          this.secretsToken.value
        );
        this.secretsCacheExpiration = new Date(
          Date.now() + this.get<number>("secrets.cache-duration-seconds") * 1000
        );
      }

      if (this.secretsCache[secretKey] === undefined) {
        throw new Error(`Secret ${secretKey} not found`);
      }

      return this.secretsCache[secretKey] as T;
    } else if (typeof v === "object" && v !== null) {
      if (Array.isArray(v)) {
        const newObjs: any[] = [];
        for (const value of v) {
          newObjs.push(await this.processSecrets(value));
        }
        return newObjs as T;
      } else {
        const newObj: any = {};
        for (const key of Object.keys(v)) {
          const value = (v as any)[key];
          newObj[key] = await this.processSecrets(value);
        }
        return newObj as T;
      }
    }

    return v;
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

      let obj = mergeWith({}, this.values, mergeWithCustomizer);

      const keyParts = keyToFetchValue.split(".");
      for (const part of keyParts) {
        // convert to camelCase first
        const newPart = part.replace(/-([a-zA-Z0-9])/g, function (_, match) {
          return match.toUpperCase();
        });

        if (typeof obj[newPart] === "undefined" && obj[part] === undefined) {
          throw new Error(`Could not find value for key ${keyParts.join(".")}`);
        } else if (obj[newPart] === undefined && obj[part] !== undefined) {
          obj = obj[part];
        } else {
          obj = obj[newPart];
        }
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

  public normalizeArray(arr: any[], currentPath: string[]): any[] {
    return arr.map((value) => {
      if (typeof value === "string") {
        return this.normalizeString(value, currentPath);
      } else if (typeof value === "object") {
        if (value === null) {
          return null;
        } else if (Array.isArray(value)) {
          return this.normalizeArray(value, currentPath);
        } else {
          return this.normalizeObject(value, currentPath);
        }
      }

      return value;
    });
  }

  public normalizeObject(obj: any, currentPath: string[]): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    const newObj = mergeWith({}, obj, mergeWithCustomizer);

    for (const property of Object.keys(newObj)) {
      const value = newObj[property];
      if (typeof value === "string") {
        newObj[property] = this.normalizeString(value, currentPath);
      } else if (typeof value === "object") {
        if (value === null) {
          newObj[property] = null;
        } else if (Array.isArray(value)) {
          newObj[property] = this.normalizeArray(value, currentPath);
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
    const values = mergeWith({}, this.normalizedValues, mergeWithCustomizer);

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

    mergeWith(this.customValues, obj, mergeWithCustomizer);
  }

  public async save(): Promise<void> {
    const fileContents = JSON.stringify(this.customValues, null, 2);
    await fs.promises.writeFile(this.configDir, fileContents, {
      encoding: "utf-8",
    });
  }
}
