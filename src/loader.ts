import fs from "fs";
import path from "path";
import { parse as parseJsonc } from "jsonc-parser";
import JSON5 from "json5";
import YAML from "js-yaml";
import merge from "lodash.merge";
import Config from "./config";

export interface IConfigFolderOptions {
  variableCasing?: "original" | "camel" | "both";
  parentNames?: string[];
}

export class Loader {
  public static readConfigSettings(folder: string): IConfigFolderOptions {
    let options: IConfigFolderOptions = {};
    const configFiles = ["_config.json", "config.json"];
    for (const configFile of configFiles) {
      if (fs.existsSync(path.join(folder, configFile))) {
        try {
          options = JSON.parse(
            fs.readFileSync(path.join(folder, configFile), {
              encoding: "utf-8",
            })
          );

          break;
        } catch (e: any) {
          console.error(
            `Invalid JSON in ${path.join(
              folder,
              configFile
            )} file; skipping configuration`
          );

          break;
        }
      }
    }

    return options;
  }

  // add additional camelCase keys for any kebab-case keys (without overwriting existing keys)
  public static convertKebabToCamelCase(
    obj: any,
    options: IConfigFolderOptions
  ): any {
    const newObj: any = {};

    const objectOptions: IConfigFolderOptions = {
      ...options,
    };

    if (typeof obj.variableCasing === "string") {
      objectOptions.variableCasing = obj.variableCasing;
    }

    for (const key of Object.keys(obj)) {
      const newKey = key.replace(/-([a-zA-Z0-9])/g, function (_, match) {
        return match.toUpperCase();
      });

      if (typeof obj[newKey] !== "undefined" && newKey !== key) {
        console.error(
          `Key ${newKey} already exists in object, but ${key} was also defined, skipping ${key}`
        );
        continue;
      }

      let newSubObj: any = {};
      if (
        typeof obj[key] === "object" &&
        !Array.isArray(obj[key]) &&
        obj[key] !== null
      ) {
        newSubObj = Loader.convertKebabToCamelCase(obj[key], objectOptions);
      } else if (Array.isArray(obj[key])) {
        newSubObj = obj[key].map((item: any) => {
          if (
            typeof item === "object" &&
            !Array.isArray(item) &&
            item !== null
          ) {
            return Loader.convertKebabToCamelCase(item, objectOptions);
          } else {
            return item;
          }
        });
      } else {
        newSubObj = obj[key];
      }

      const keepCamel =
        typeof objectOptions.variableCasing === "undefined" ||
        objectOptions.variableCasing === "camel" ||
        objectOptions.variableCasing === "both";
      const keepOriginal =
        objectOptions.variableCasing === "original" ||
        objectOptions.variableCasing === "both";

      if (keepCamel) {
        newObj[newKey] = newSubObj;
      }

      if (keepOriginal && ((keepCamel && newKey !== key) || !keepCamel)) {
        newObj[key] = newSubObj;
      }
    }

    return newObj;
  }

  public static loadFile(filePath: string, options: IConfigFolderOptions): any {
    if (!fs.existsSync(filePath)) {
      return {};
    }

    const fileContents = fs.readFileSync(filePath, {
      encoding: "utf-8",
    });

    const fileParts = filePath.split(".");
    const extension = fileParts[fileParts.length - 1];

    let obj: any;
    if (/^ya?ml$/i.exec(extension)) {
      // yaml file
      obj = YAML.load(fileContents);
    } else if (/^json$/i.exec(extension)) {
      // json file
      obj = JSON.parse(fileContents);
    } else if (/^jsonc$/i.exec(extension)) {
      // jsonc file
      obj = parseJsonc(fileContents); // todo: handle error callback
    } else if (/^json5$/i.exec(extension)) {
      // json5 file
      obj = JSON5.parse(fileContents);
    } else {
      console.log(
        `Invalid file name ${filePath}. Only yml, yaml, json, jsonc, json5 extensions are supported (case insensitive).`
      );
      obj = {};
    }

    return obj;
  }

  public static loadRoot(
    folder: string,
    options: IConfigFolderOptions,
    config: Config
  ): any {
    const baseObj: any = {};

    if (options.parentNames) {
      for (const parentName of options.parentNames) {
        if (parentName === "default") {
          // skip explicitly stated default parents; they're already loaded
          continue;
        }
        const parentFolder = config.configEnvDir(parentName);

        if (parentFolder) {
          const parentOptions = Loader.readConfigSettings(parentFolder);
          merge(
            baseObj,
            Loader.loadRoot(
              parentFolder,
              {
                ...options,
                parentNames: parentOptions.parentNames,
              },
              config
            )
          );
        }
      }
    }

    merge(baseObj, Loader.load(folder, options));

    return baseObj;
  }

  public static load(folder: string, options: IConfigFolderOptions): any {
    if (!fs.existsSync(folder)) {
      return {};
    }

    const baseObj: any = {};

    const contents = fs.readdirSync(folder, {
      encoding: "utf-8",
      withFileTypes: true,
    });

    // first load the index file
    for (const content of contents) {
      if (!content.isDirectory() && /^_?index\./.exec(content.name) !== null) {
        merge(
          baseObj,
          Loader.loadFile(path.join(folder, content.name), options)
        );
      }
    }

    // then load other files
    for (const content of contents) {
      // skip git meta files (.gitignore, .gitattributes, etc)
      if (/^\.git/.exec(content.name) !== null) {
        continue;
      }

      if (content.isDirectory()) {
        const key = content.name;

        if (typeof baseObj[key] === "undefined") {
          baseObj[key] = {};
        }

        const obj = Loader.load(path.join(folder, content.name), options);

        merge(baseObj[key], obj);
      } else {
        if (/^_?index\./.exec(content.name) !== null) {
          // we already loaded this to be be in the base config
          continue;
        }

        const fileParts = content.name.split(".");
        if (fileParts.length === 2) {
          const key = fileParts[0];

          if (typeof baseObj[key] === "undefined") {
            baseObj[key] = {};
          }

          const obj = Loader.loadFile(path.join(folder, content.name), options);

          merge(baseObj[key], obj);
        } else {
          console.log(
            `Invalid file name ${content.name}. Config files must have a supported extension and contain no extra periods in the file name`
          );
          continue;
        }
      }
    }

    return baseObj;
  }
}
