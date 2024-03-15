import { describe, expect, test } from "@jest/globals";
import { Config } from "../../src/config";
import path from "path";

describe("Kebab-case conversion", () => {
  const config = new Config({
    configDir: path.join(__dirname),
  });

  test("correctly maintains existing key structure", () => {
    expect(config.get<string>("hello-world")).toBe("val1");
    expect(config.get<string>("test-1")).toBe("val2");
    expect(config.get<string>("hello-world-goodbye-universe")).toBe("val3");
    expect(config.get<string>("nested-obj.nested-key")).toBe("val4");
    expect(config.get<string>("nested-obj.nested-key-2")).toBe("val5");
  });

  test("doesn't overwrite existing keys camelCase keys", () => {
    expect(config.get<string>("nested-obj.nestedKey2")).toBe("val6");
  });

  test("correctly converts kebab-case keys to camelCase", () => {
    expect(config.get<string>("helloWorld")).toBe("val1");
    expect(config.get<string>("test1")).toBe("val2");
    expect(config.get<string>("helloWorldGoodbyeUniverse")).toBe("val3");
    expect(config.get<string>("nestedObj.nestedKey")).toBe("val4");
  });

  test("can evaluate keys with objet getter", () => {
    const nestedObj = config.get<any>("nestedObj");
    expect(nestedObj.nestedKey).toBe("val4");
    expect(nestedObj.nestedKey2).toBe("val6");
  });
});
