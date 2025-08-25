#!/usr/bin/env node

import { execSync } from "child_process";
import mergeWith from "lodash.mergewith";
import config from "./index";
import { mergeWithCustomizer } from "./merge-customizer";

let command = process.argv.slice(2).join(" ");

let envName = "";
if (command.startsWith("--env=") || command.startsWith("-e=")) {
  const isLongOption = command.startsWith("--env=");

  const commandAfterEnv = command.substring(
    command.indexOf(isLongOption ? "--env=" : "-e=") + (isLongOption ? 6 : 3)
  );

  if (commandAfterEnv.startsWith('"') || commandAfterEnv.startsWith("'")) {
    const quoteChar = commandAfterEnv[0];
    // find next quoteChar, ensuring it wasn't escaped
    let endQuoteIndex = -1;
    let startQuoteIndex = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      endQuoteIndex = commandAfterEnv.indexOf(quoteChar, startQuoteIndex + 1);

      if (endQuoteIndex !== -1 && commandAfterEnv[endQuoteIndex - 1] !== "\\") {
        break;
      }

      if (endQuoteIndex === -1) {
        throw new Error(
          `Unmatched quote in command: ${commandAfterEnv}. Please ensure quotes are properly closed.`
        );
      }

      startQuoteIndex = endQuoteIndex;
    }

    envName = commandAfterEnv.substring(1, endQuoteIndex).trim();
    command = commandAfterEnv.substring(endQuoteIndex + 1).trim();

    config.init({
      configDir: config.dir(),
      configEnv: envName,
      cwd: config.cwd(),
    });
  } else {
    const tokens = commandAfterEnv.split(" ");
    envName = tokens[0].trim();
    command = tokens.slice(1).join(" ").trim();
  }
}

const env: any = {};

if (envName) {
  env.NODE_CONFIG_ENV = envName;
}

mergeWith(env, process.env, config.getConfiguredEnv(), mergeWithCustomizer);

execSync(command, {
  env,
  stdio: "inherit",
});
