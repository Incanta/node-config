import { describe, expect, test } from "@jest/globals";
import { Config } from "../../src/config";
import path from "path";

describe("Config with local folder", () => {
  const config = new Config({
    configDir: path.join(__dirname),
  });

  test("correctly loaded local directory", () => {
    expect(config.get<number>("thing.test")).toBe(3);
  });
});
