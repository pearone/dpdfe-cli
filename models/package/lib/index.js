"use strict";

const path = require("path");
const fse = require("fs-extra");
const pkgDir = require("pkg-dir").sync;
const pathExists = require("path-exists").sync;
const npminstall = require("npminstall");
const { isObject } = require("@dpd-cli/utils");
const formatPath = require("@dpd-cli/format-path");
const {
  getDefaultRegistry,
  getNpmLatestVersion,
} = require("@dpd-cli/get-npm-info");

class Package {
  constructor(options) {
    if (!options) {
      throw new Error("Package类的options参数不能为空");
    }
    if (!isObject(options)) {
      throw new Error("Package类的options参数必须为对象");
    }
    // package的目标路径
    this.targetPath = options.targetPath;
    // 缓存路径
    this.storeDir = options.storeDir;
    // package的name
    this.packageName = options.packageName;
    // package的version
    this.packageVersion = options.packageVersion;
    // 缓存包名前缀 针对有域名情况下的包名@dpd-cli/init
    this.cacheFilePathPrefix = this.packageName.replace("/", "_");
  }

  /**
   * 获取版本路径
   */
  get cacheFilePath() {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
    );
  }

  /**
   * 拼装指定版本路径
   * @param {string} version
   * @returns
   */
  getSpecialCacheFilePath(version) {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${version}@${this.packageName}`
    );
  }

  /**
   * 装前准备
   */
  async prepare() {
    if (this.storeDir && !pathExists(this.storeDir)) {
      fse.mkdirpSync(this.storeDir);
    }
    if (this.packageVersion === "latest") {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }

  /**
   * 是否存在包
   */
  async exists() {
    if (this.storeDir) {
      await this.prepare();
      return pathExists(this.cacheFilePath);
    } else {
      return pathExists(this.targetPath);
    }
  }

  /**
   * 安装包
   */
  async install() {
    await this.prepare();
    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [{ name: this.packageName, version: this.packageVersion }],
    });
  }

  /**
   * 更新包
   */
  async update() {
    await this.prepare();
    const latestPackageVersion = await getNpmLatestVersion(this.packageName);
    const latestFilePath = await this.getSpecialCacheFilePath(
      latestPackageVersion
    );
    if (!pathExists(latestFilePath)) {
      return npminstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [{ name: this.packageName, version: latestPackageVersion }],
      });
    }
    this.packageVersion = latestPackageVersion;
  }

  /**
   * 获取入口文件路径
   */
  getRootFilePath() {
    function _getRootFile(targetPath) {
      const dir = pkgDir(targetPath);
      if (dir) {
        const pkgFile = require(path.resolve(dir, "package.json"));
        if (pkgFile && pkgFile.main) {
          return formatPath(path.resolve(dir, pkgFile.main));
        }
      }
      return null;
    }
    if (this.storeDir) {
      return _getRootFile(this.cacheFilePath);
    } else {
      return _getRootFile(this.targetPath);
    }
  }
}

module.exports = Package;
