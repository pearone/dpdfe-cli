"use strict";

const fs = require("fs");
const path = require("path");
const glob = require("glob");
const ejs = require("ejs");
const fse = require("fs-extra");
const inquirer = require("inquirer");
const log = require("@dpd-cli/log");
const userHome = require("user-home");
const semver = require("semver");
const Command = require("@dpd-cli/command");
const Package = require("@dpd-cli/package");
const { Spinner, sleep, spawnAsync } = require("@dpd-cli/utils");
const getTemplateRequest = require("./get-template-request");

const DEFAULT_CLI_HOME = ".dpd-cli";

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";

const TEMPLATE_TYPE_NORMAL = "normal";
const TEMPLATE_TYPE_CUSTOM = "custom";

const WHITE_COMMAND = ["npm", "cnpm"];
class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.force = !!this._cmd.force;
  }
  async exec() {
    try {
      // 1. 准备阶段
      const projectInfo = await this.prepare();
      if (projectInfo) {
        this.projectInfo = projectInfo;
        // 2. 下载模版
        await this.downloadTemplate();
        // 3. 安装模版
        await this.installTemplate();
      }
    } catch (e) {
      throw new Error(e.message);
    }
  }

  /**
   * 安装模版
   */
  async installTemplate() {
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate();
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        await this.installCustomTemplate();
      } else {
        throw new Error("项目模板信息类型无法识别");
      }
    } else {
      throw new Error("项目模板信息不存在");
    }
  }

  checkCommand(cmd) {
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd;
    }
    return null;
  }

  /**
   * 标准模版安装
   */
  async installNormalTemplate() {
    log.verbose("安装标准模板");
    log.verbose("templateNpm", this.templateNpm);

    // 拷贝模板代码到当前目录
    const spinner = await Spinner({ text: "正在安装模板..." });
    spinner.start();
    const templatePath = path.resolve(
      this.templateNpm.cacheFilePath,
      "template"
    );
    const targetPath = process.cwd();
    await sleep();
    try {
      fse.ensureDirSync(templatePath); // 确保目录存在
      fse.ensureDirSync(targetPath); // 确保目录存在
      fse.copySync(templatePath, targetPath); // 拷贝到 targetPath 目录下
    } catch (e) {
      throw e;
    } finally {
      spinner.succeed("模板安装成功");
    }

    const templateIgnore = this.templateInfo.ignore || [];
    const ignore = ["**/node_modules/**", ...templateIgnore];
    await this.ejsRender({ ignore });

    const { installCommand, startCommand } = this.templateInfo;
    let installCmdRet, startCmdRet;

    // 依赖安装
    await this.execCommand(installCommand, "依赖安装失败");

    // 启动命令执行
    // await this.execCommand(startCommand, "启动命令执行失败");
  }

  /**
   * 自定义模版
   */
  async installCustomTemplate() {
    log.verbose("安装自定义模板");
    log.verbose("templateNpm", this.templateNpm);
    if (await this.templateNpm.exists()) {
      const rootFile = this.templateNpm.getRootFilePath();
      log.verbose("rootFile", rootFile);
      if (fs.existsSync(rootFile)) {
        log.notice("开始执行自定义模板安装");
        const templatePath = path.resolve(
          this.templateNpm.cacheFilePath,
          "template"
        );
        const options = {
          targetPath: process.cwd(),
          sourcePath: templatePath,
          templateInfo: this.templateInfo,
          projectInfo: this.projectInfo,
        };
        const code = `require('${rootFile}')(${JSON.stringify(options)})`;
        await spawnAsync("node", ["-e", code], {
          stdio: "inherit",
          cwd: process.cwd(),
        });
        log.success("自定义模板安装成功");
      } else {
        throw new Error("自定义模板入口文件不存在！");
      }
    }
  }

  async ejsRender(options) {
    const cwd = process.cwd();
    return new Promise((resolve1, reject1) => {
      glob(
        "**",
        {
          cwd: cwd,
          ignore: options.ignore || "",
          nodir: true,
        },
        (err, files) => {
          if (err) {
            reject1(err);
          }

          Promise.all(
            files.map((file) => {
              const filePath = path.join(cwd, file);
              return new Promise((resolve2, reject2) => {
                ejs.renderFile(
                  filePath,
                  this.projectInfo,
                  {},
                  (err, result) => {
                    if (err) {
                      reject2(err);
                    }

                    fse.writeFileSync(filePath, result);
                    resolve2(result);
                  }
                );
              });
            })
          )
            .then(() => {
              resolve1();
            })
            .catch((err) => {
              reject1(err);
            });
        }
      );
    });
  }

  async execCommand(command, errMsg) {
    if (command) {
      const cmdOptions = command.split(" ");
      const cmd = this.checkCommand(cmdOptions[0]);
      const args = cmdOptions.slice(1);
      const ret = await spawnAsync(cmd, args, {
        stdio: "inherit",
        cwd: process.cwd(),
      });

      if (ret !== 0) {
        throw new Error(errMsg);
      }

      return ret;
    }

    throw new Error(`命令不存在`);
  }

  /**
   * 下载模版
   */
  async downloadTemplate() {
    log.verbose("projectInfo", this.projectInfo);
    log.verbose("template", this.template);
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(
      (item) => item.name === projectTemplate
    );
    this.templateInfo = templateInfo;
    const targetPath = path.resolve(userHome, DEFAULT_CLI_HOME, "template");
    const storeDir = path.resolve(
      userHome,
      DEFAULT_CLI_HOME,
      "template",
      "node_modules"
    );
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: templateInfo.name,
      packageVersion: templateInfo.version,
    });
    this.templateNpm = templateNpm;
    if (!(await templateNpm.exists())) {
      const spinner = await Spinner({ text: "正在下载模版..." });
      spinner.start();
      await sleep();
      try {
        await templateNpm.install();
      } catch (e) {
        throw new Error(e);
      } finally {
        spinner.succeed("下载模版成功");
      }
    } else {
      const spinner = await Spinner({ text: "正在更新模版..." });
      spinner.start();
      await sleep();
      try {
        await templateNpm.update();
      } catch (e) {
        throw new Error(e);
      } finally {
        spinner.succeed("更新模版成功");
      }
    }
  }

  async prepare() {
    const template = await getTemplateRequest();

    if (!template || template.length === 0) {
      throw new Error("项目模版不存在");
    }
    this.template = template;
    const localPath = process.cwd();
    log.verbose("localPath", localPath);
    if (!this.isDirEmpty(localPath)) {
      let ifContinue = false;
      if (!this.force) {
        ifContinue = (
          await inquirer.prompt({
            type: "confirm",
            name: "ifContinue",
            default: false,
            message: "当前文件夹不为空，是否继续创建项目？",
          })
        ).ifContinue;
        if (!ifContinue) {
          return;
        }
      }
      if (ifContinue || this.force) {
        const { confirmDelete } = await inquirer.prompt({
          type: "confirm",
          name: "confirmDelete",
          default: false,
          message: "是否确认清空当前目录下的文件？",
        });
        if (confirmDelete) {
          fse.emptyDirSync(localPath);
        }
      }
    }
    return this.getProjectInfo();
  }

  async getProjectInfo() {
    let project = {};
    const { type } = await inquirer.prompt({
      type: "list",
      name: "type",
      message: "请选择初始化类型",
      default: TYPE_PROJECT,
      choices: [
        { name: "项目", value: TYPE_PROJECT },
        { name: "组件", value: TYPE_COMPONENT },
      ],
    });
    if (type === TYPE_PROJECT) {
      project = await inquirer.prompt([
        {
          type: "input",
          name: "projectName",
          message: "请选择项目名称",
          default: "project",
          validate: function (v) {
            const done = this.async();
            setTimeout(() => {
              if (
                !/^[a-zA-Z]+([-|_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)
              ) {
                done(
                  "请输入合法的项目名称（支持字母数字中下划线、以字母开头）"
                );
                return;
              }
              done(null, true);
            }, 0);
          },
          filter: (v) => {
            return v;
          },
        },
        {
          type: "input",
          name: "projectVersion",
          message: "请输入项目版本号",
          default: "1.0.0",
          validate: function (v) {
            const done = this.async();
            setTimeout(() => {
              if (!!!semver.valid(v)) {
                done("请输入正确的版本号格式");
                return;
              }
              done(null, true);
            }, 0);
          },
          filter: (v) => {
            return semver.valid(v) ? semver.valid(v) : v;
          },
        },
        {
          type: "list",
          name: "projectTemplate",
          message: "请选择项目模版",
          choices: this.createTemplateChoice(),
        },
      ]);
    } else if (type === TYPE_COMPONENT) {
    }
    return { type, ...project };
  }

  /**
   * 获取可选模版项目列表
   * @returns Array
   */
  createTemplateChoice() {
    return this.template.map((item) => {
      return {
        name: item.description,
        value: item.name,
      };
    });
  }

  /**
   * 目录是否为空
   * @returns boolean
   */
  isDirEmpty(localPath) {
    const fileList = fs
      .readdirSync(localPath)
      .filter(
        (file) =>
          !file.toString().startsWith(".") &&
          ["node_modules"].includes(file) <= 0
      );
    return !fileList || fileList.length === 0;
  }
}

/**
 * 动态加载init command
 * @param {string} projectName
 * @param {object} cmdObj
 */
function init(argv) {
  return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
