import { describe, expect, test } from "@jest/globals";
import Config from "../../src/config";
import path from "path";

describe("Config with inherited base file", () => {
  const config = new Config({
    configDir: path.join(__dirname),
    configEnv: "local",
  });

  test("correctly loaded base object", () => {
    expect(config.get<string>("instances.base.foo")).toBe("bar");
    expect(config.get<string>("instances.base.hello")).toBe("world");
  });

  test("correctly loaded default object", () => {
    expect(config.get<string>("instances.default.foo")).toBe("bar");
    expect(config.get<string>("instances.default.hello")).toBe("universe");
  });

  test("correctly loaded custom object", () => {
    expect(config.get<string>("instances.custom.foo")).toBe("bar");
    expect(config.get<string>("instances.custom.hello")).toBe("city");
  });
});
