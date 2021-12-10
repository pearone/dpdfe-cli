"use strict";

const path = require("path");
const { spawn } = require("@dpd-cli/utils");
const Package = require("@dpd-cli/package");
const log = require("@dpd-cli/log");

const CACHE_DIR = "dependences";
const SETTINGS = { init: "@dpd-cli/init" };

async function exec() {
  try {
    let targetPath = process.env.CLI_TARGET_PATH,
      storeDir,
      pkg;
    const homePath = process.env.CLI_HOME_PATH;

    log.verbose("targetPath", targetPath);
    log.verbose("homePath", homePath);

    const cmdObj = arguments[arguments.length - 1];
    const cmdName = cmdObj.name();
    const packageName = SETTINGS[cmdName];
    const packageVersion = "1.0.7";

    if (!targetPath) {
      targetPath = path.resolve(homePath, CACHE_DIR); // 生成缓存路径
      storeDir = path.resolve(targetPath, "node_modules");
      pkg = new Package({ targetPath, storeDir, packageName, packageVersion });

      if (await pkg.exists()) {
        await pkg.update();
      } else {
        await pkg.install();
      }
    } else {
      pkg = new Package({ targetPath, packageName, packageVersion });
    }

    const rootFile = pkg.getRootFilePath();

    if (rootFile) {
      try {
        const args = Array.from(arguments);
        const cmd = args[args.length - 1];
        const o = Object.create(null);
        Object.keys(cmd).forEach((key) => {
          if (
            cmd.hasOwnProperty(key) &&
            !key.startsWith("_") &&
            key !== "parent"
          ) {
            o[key] = cmd[key];
          }
        });
        args[args.length - 1] = o;
        const code = `require('${rootFile}').call(null, ${JSON.stringify(
          args
        )})`;

        const child = spawn("node", ["-e", code], {
          cwd: process.cwd(),
          stdio: "inherit",
        });

        child.on("error", (e) => {
          log.error(e.message);
          process.exit(1);
        });

        child.on("exit", (e) => {
          log.verbose("执行命令成功");
          process.exit(e);
        });
      } catch (e) {
        log.error(e.message);
      }
    }
  } catch (e) {
    throw new Error(e.message);
  }
}

module.exports = exec;
