#!/usr/bin/env node

import { execSync } from "child_process";
import mergeWith from "lodash.mergewith";
import config from "./index";
import { mergeWithCustomizer } from "./merge-customizer";

const command = process.argv.slice(2).join(" ");

const env: any = {};

mergeWith(env, process.env, config.getConfiguredEnv(), mergeWithCustomizer);

execSync(command, {
  env,
  stdio: "inherit",
});
