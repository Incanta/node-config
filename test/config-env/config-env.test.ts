import { describe, expect, test } from "@jest/globals";
import Config from "../../src/config";
import path from "path";

describe("Config with env folder", () => {
  test("correctly loaded production directory", () => {
    const config = new Config({
      configDir: path.join(__dirname),
      configEnv: "production",
    });
    expect(config.get<number>("thing.test")).toBe(2);
  });

  test("correctly loaded dev directory", () => {
    const config = new Config({
      configDir: path.join(__dirname),
      configEnv: "dev",
    });
    expect(config.get<number>("thing.test")).toBe(3);
  });

  test("correctly shows default value for invalid env directory", () => {
    process.env["NODE_CONFIG_SKIP_ENV_WARNING"] = "true";
    const config = new Config({
      configDir: path.join(__dirname),
      configEnv: "invalid",
    });
    process.env["NODE_CONFIG_SKIP_ENV_WARNING"] = "false";
    expect(config.get<number>("thing.test")).toBe(1);
  });
});
