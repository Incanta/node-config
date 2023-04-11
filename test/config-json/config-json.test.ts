import { describe, expect, test } from "@jest/globals";
import { Config } from "../../src/config";
import path from "path";

describe("Config with JSON files", () => {
  const config = new Config({
    configDir: path.join(__dirname),
  });

  test("correctly loaded default directory", () => {
    expect(config.get<string>("hello")).toBe("world");
    expect(config.get<number>("foo.bar")).toBe(42);
  });

  test("correctly loaded sub default directory", () => {
    const arr = config.get<number[]>("goodbye.universe");
    expect(arr.length).toBe(4);
    expect(arr[0]).toBe(1);
    expect(arr[1]).toBe(3);
    expect(arr[2]).toBe(3);
    expect(arr[3]).toBe(7);
  });
});
