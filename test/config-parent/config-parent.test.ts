import { describe, expect, test } from "@jest/globals";
import Config from "../../src/config";
import path from "path";

describe("Config with a specified parent", () => {
  const config = new Config({
    configDir: path.join(__dirname),
    configEnv: "production-child",
  });

  test("correctly loaded parent", () => {
    expect(config.get<number>("thing.test")).toBe(3);
    expect(config.get<string>("thing.foo")).toBe("nobar");
    expect(config.get<string>("thing.name")).toBe("alice");
  });
});
