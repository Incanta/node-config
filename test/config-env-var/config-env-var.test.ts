import { describe, expect, test } from "@jest/globals";
import { Config } from "../../src/config";
import path from "path";

describe("Injects environment variables from config", () => {
  const config = new Config({
    configDir: path.join(__dirname),
  });

  test("correctly loads the correct environment variables", () => {
    const env = config.getConfiguredEnv();
    expect(env.ENV_VAR_1).toBe("world");
    expect(env.ENV_VAR_2).toBe("42");
    expect(env.ENV_VAR_3).toBe("iamfoo:iambar");
    expect(env.ENV_VAR_4).toBe("mything1/mything2");
  });
});
