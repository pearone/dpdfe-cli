"use strict";

const LOWEST_NODE_VERSION = "12.0.0";

const semver = require("semver");
const colors = require("colors/safe");
const log = require("@dpd-cli/log");

class Command {
  constructor(argv) {
    if (!argv) {
      throw new Error("参数不能为空！");
    }
    if (!Array.isArray(argv)) {
      throw new Error("参数必须为数组！");
    }
    if (argv.length < 1) {
      throw new Error("参数列表为空！");
    }
    this._argv = argv;

    let runner = new Promise(() => {
      let chain = Promise.resolve();
      chain = chain.then(() => {
        this.checkNodeVersion();
      });
      chain = chain.then(() => {
        this.initArgs();
      });
      chain = chain.then(() => {
        this.init();
      });
      chain = chain.then(() => {
        this.exec();
      });

      chain.catch((err) => {
        log.error(err.message);
      });
    });
  }

  /**
   * 检查node版本号
   */
  checkNodeVersion() {
    const currentVersion = process.version;
    const lowestVersion = LOWEST_NODE_VERSION;
    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(
        colors.red(`需要安装 v${lowestVersion} 以上版本的 node.js`)
      );
    }
  }

  initArgs() {
    this._cmd = this._argv[this._argv.length - 1];
    this._argv = this._argv.slice(0, this._argv.length - 1);
  }

  init() {
    throw new Error("请重写init方法!");
  }

  exec() {
    throw new Error("请重写exec方法!");
  }
}

module.exports = Command;
