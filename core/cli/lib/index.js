"use strict";

// require .js/.json/.node
// .js exports/module.exports\ .json JSON.parse\ .node process.dlopen
const path = require("path");

const semver = require("semver");
const colors = require("colors/safe");
const log = require("@dpd-cli/log");
const exec = require("@dpd-cli/exec");
const userHome = require("user-home");
const pathExists = require("path-exists").sync;
const { Command } = require("commander");

const constants = require("../constants");
const pkg = require("../package.json");

const program = new Command();

async function core() {
  try {
    await prepare();
    registerCommand();
  } catch (e) {
    log.error(e.message);
    if (process.env.LOG_LEVEL === "verbose") {
      console.log(e);
    }
  }
}

async function prepare() {
  checkPkgVersion();
  checkRoot();
  checkUserHome();
  // checkInputArgs();
  checkEnv();
  // await checkGlobalUpdate();
}

/**
 * 注册脚手架
 */
function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d --debug", "是否开启调试模式", false)
    .option("-tp, --targetPath <targetPath>", "是否指定本地调试文件路径");

  program
    .command("init [project name]")
    .option("-f --force", "是否强制初始化项目")
    .action(exec);

  // 实现debug模式
  program.on("option:debug", function () {
    if (program.debug) {
      process.env.LOG_LEVEL = "verbose";
    } else {
      process.env.LOG_LEVEL = "info";
    }
    log.level = process.env.LOG_LEVEL;
  });

  // 指定targetPath
  program.on("option:targetPath", function () {
    process.env.CLI_TARGET_PATH = program.targetPath;
  });

  // 未知命令监听
  program.on("command:*", function (obj) {
    console.log(colors.red("未知的命令" + obj[0]));
    const availableCommands = program.commands.map((cmd) => cmd.name());
    if (availableCommands.length > 0) {
      console.log(colors.red("可用命令：" + availableCommands.join(",")));
    }
  });

  program.parse(process.argv);

  if (program.args && program.args.length < 1) {
    console.log();
    program.outputHelp();
    console.log();
  }
}

/**
 * 检查版本号
 */
function checkPkgVersion() {
  log.info(pkg.version);
}

/**
 * 检查启动权限
 */
function checkRoot() {
  const rootCheck = require("root-check");
  rootCheck();
}

/**
 * 获取用户主目录信息
 */
function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red("当前用户主目录不存在"));
  }
}

// /**
//  * 参数解析
//  */
// function checkInputArgs() {
//   args = require("minimist")(process.argv.slice(2));
//   checkDebugArgs(args);
// }

// /**
//  * debug模式启动
//  * @param {*} args
//  */
// function checkDebugArgs(args) {
//   if (args.debug) {
//     process.env.LOG_LEVEL = "verbose";
//   } else {
//     process.env.LOG_LEVEL = "info";
//   }
//   log.level = process.env.LOG_LEVEL;
// }

/**
 * 环境变量
 */
function checkEnv() {
  const dotenv = require("dotenv");
  const dotenvPath = path.resolve(userHome, ".env");
  if (pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath,
    });
  }
  createDefaultEnvConfig();
  log.verbose("Checking env");
}

/**
 * 默认环境变量配置
 */
function createDefaultEnvConfig() {
  const tempConfig = {
    home: userHome,
  };
  if (process.env.CLI_HOME) {
    tempConfig["cliHome"] = path.join(userHome, process.env.CLI_HOME);
  } else {
    tempConfig["cliHome"] = path.join(userHome, constants.DEFAULT_CLI_HOME);
  }
  process.env.CLI_HOME_PATH = tempConfig.cliHome;
  return tempConfig;
}

/**
 * 检查是否全局更新
 */
async function checkGlobalUpdate() {
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  const { getNpmSemverVersion } = require("@dpd-cli/get-npm-info");
  const lastestVersion = await getNpmSemverVersion(currentVersion, npmName);
  if (lastestVersion && semver.gt(lastestVersion, currentVersion)) {
    log.warn(
      colors.yellow(
        `${npmName} 当前版本：${currentVersion}，最新版本：${lastestVersion}，手动更新命令：npm install -g ${npmName}`
      )
    );
  }
}

module.exports = core;
