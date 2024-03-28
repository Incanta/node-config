import { describe, expect, test } from "@jest/globals";
import Config from "../../src/config";
import path from "path";

describe("Config with override folder", () => {
  test("correctly loaded production directory", () => {
    const config = new Config({
      configDir: path.join(__dirname),
      configEnv: "production",
    });
    expect(config.get<number>("thing.test")).toBe(4);
  });
});
