import { describe, expect, test } from "@jest/globals";
import Config from "../../src/config";
import path from "path";

describe("Kebab-case conversion", () => {
  const config = new Config({
    configDir: path.join(__dirname),
  });

  const configKeep = new Config({
    configDir: path.join(__dirname),
    configEnv: "keep",
  });

  test("correctly maintains existing key structure", () => {
    expect(config.get<string>("hello-world")).toBe("val1");
    expect(config.get<string>("test-1")).toBe("val2");
    expect(config.get<string>("hello-world-goodbye-universe")).toBe("val3");
    expect(config.get<string>("nested-obj.nested-key")).toBe("val4");
    expect(config.get<string>("nested-obj.nested-key-2")).toBe("val5");
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
    expect(nestedObj.nestedKey2).toBe("val5");
  });

  test("can convert objects in array", () => {
    const arr = config.get<any>("arr");
    expect(arr.length).toBe(2);
    expect(arr[0].arrKey).toBe("val7");
    expect(arr[1].arrObj.arrKey2).toBe("val8");
  });

  test("doesn't mess up arrays with literal values", () => {
    const arr = config.get<any>("arr2");
    expect(arr.length).toBe(2);
    expect(arr[0]).toBe("val9");
    expect(arr[1]).toBe("val10");
  });

  test("keeps kebab-case keys enabled", () => {
    expect(config.get<string>("hello-world")).toBe("val1");

    const origObj = config.getJson();
    const keepObj = configKeep.getJson();

    expect(keepObj["hello-world"]).toBe("val1");
    expect(keepObj.helloWorld).toBe("val1");
    expect(origObj["hello-world"]).toBeUndefined();
  });
});
