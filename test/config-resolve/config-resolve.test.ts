import { describe, expect, test } from "@jest/globals";
import Config from "../../src/config";
import path from "path";

describe("Config with YAML files", () => {
  const config = new Config({
    configDir: path.join(__dirname),
  });

  test("correctly resolves a single reference", () => {
    expect(config.get<string>("hello")).toBe("world");
    expect(config.get<string>("goodbye")).toBe("world");
  });

  test("correctly resolves a single reference with extra text", () => {
    expect(config.get<string>("foo")).toBe("world-hello");
  });

  test("correctly resolves a recursive reference", () => {
    expect(config.get<string>("bar")).toBe("world-hello-bar");
  });

  test("correctly resolves multiple references", () => {
    expect(config.get<string>("multi")).toBe("world-hello-world-hello-bar");
  });

  test("correctly resolves down object trees", () => {
    const obj = config.get<any>("root");
    expect(obj.child).toBe("world-child");
    expect(obj.child2.child3).toBe("world-child3");
  });

  test("correctly resolves relative paths", () => {
    expect(config.get<string>("relative.hi")).toBe("world");
    expect(config.get<string>("root.child2.child4")).toBe("world");
  });

  test("correctly resolves arrays", () => {
    const arr = config.get<string[]>("arr");
    expect(arr.length).toBe(1);
    expect(arr[0]).toBe("world");

    const arr2 = config.get<any[]>("arr2");
    expect(arr2.length).toBe(1);
    expect(arr2[0].name).toBe("world");
  });

  test("correctly resolves paths with getJson", () => {
    const obj = config.getJson();
    expect(obj.hello).toBe("world");
    expect(obj.goodbye).toBe("world");
    expect(obj.foo).toBe("world-hello");
    expect(obj.bar).toBe("world-hello-bar");
    expect(obj.multi).toBe("world-hello-world-hello-bar");
    expect(obj.root.child).toBe("world-child");
    expect(obj.root.child2.child3).toBe("world-child3");
    expect(obj.relative.hi).toBe("world");
  });
});
