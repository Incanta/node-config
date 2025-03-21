import { describe, expect, test } from "@jest/globals";
import Config from "../../src/config";
import path from "path";

describe("Config with inherited base file", () => {
  const config = new Config({
    configDir: path.join(__dirname),
    configEnv: "child",
  });

  test("correctly loaded base object", () => {
    expect(config.get<string>("instances.base.foo")).toBe("bar");
    expect(config.get<string>("instances.base.hello")).toBe("world");
    expect(config.get<string>("instances.base.num")).toBe(42);
  });

  test("correctly loaded default object", () => {
    expect(config.get<string>("instances.default.foo")).toBe("bar");
    expect(config.get<string>("instances.default.hello")).toBe("universe");
    expect(config.get<string>("instances.default.num")).toBe(1337);
  });

  test("correctly loaded custom object", () => {
    expect(config.get<string>("instances.custom.foo")).toBe("bar");
    expect(config.get<string>("instances.custom.hello")).toBe("city");
    expect(config.get<string>("instances.custom.num")).toBe(42);
  });

  test("correctly loaded child object", () => {
    expect(config.get<string>("instances.child.foo")).toBe("bar");
    expect(config.get<string>("instances.child.hello")).toBe("town");
    expect(config.get<string>("instances.child.num")).toBe(42);
  });
});
