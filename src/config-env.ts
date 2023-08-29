#!/usr/bin/env node

import { execSync } from "child_process";
import merge from "lodash.merge";
import config from "./index";

const command = process.argv
  .slice(2)
  .map((arg) => `"${arg}"`)
  .join(" ");

const env: any = {};

merge(env, process.env, config.getConfiguredEnv());

execSync(command, {
  env,
  stdio: "inherit",
});
