import Config from "./config";

let config: Config | undefined = undefined;

function GetConfig(): Config {
  if (!config) {
    config = new Config();
  }

  return config;
}

export = GetConfig();
