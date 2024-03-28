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
  });
});
