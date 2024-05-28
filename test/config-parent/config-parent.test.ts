import { describe, expect, test } from "@jest/globals";
import Config from "../../src/config";
import path from "path";

describe("Config with a specified parent", () => {
  const config = new Config({
    configDir: path.join(__dirname),
    configEnv: "production-child",
  });

  const configGrandchild = new Config({
    configDir: path.join(__dirname),
    configEnv: "production-grandchild",
  });

  const configGreatGrandchild = new Config({
    configDir: path.join(__dirname),
    configEnv: "production-greatgrandchild",
  });

  test("correctly loaded parent", () => {
    expect(config.get<number>("thing.test")).toBe(3);
    expect(config.get<string>("thing.foo")).toBe("nobar");
    expect(config.get<string>("thing.name")).toBe("alice");
  });

  test("correctly loaded grandchild", () => {
    expect(configGrandchild.get<number>("thing.test")).toBe(3);
    expect(configGrandchild.get<string>("thing.foo")).toBe("nobar");
    expect(configGrandchild.get<string>("thing.name")).toBe("alice");
  });

  test("correctly loaded great grandchild", () => {
    expect(configGreatGrandchild.get<number>("thing.test")).toBe(3);
    expect(configGreatGrandchild.get<string>("thing.foo")).toBe("nobar");
    expect(configGreatGrandchild.get<string>("thing.name")).toBe("alice");
  });
});
