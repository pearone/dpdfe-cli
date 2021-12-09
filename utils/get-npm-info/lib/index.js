"use strict";

const axios = require("axios");
const urlJoin = require("url-join");
const semver = require("semver");

/**
 * 获取包npm配置信息
 * @param {string} npmName
 * @param {string} registry
 * @returns
 */
function getNpmInfo(npmName, registry) {
  if (!npmName) {
    return null;
  }
  const registryUrl = registry || getDefaultRegistry();
  const npmInfoUrl = urlJoin(registryUrl, npmName);
  return axios
    .get(npmInfoUrl)
    .then((res) => {
      if (res.status === 200) {
        return res.data;
      }
      return null;
    })
    .catch((err) => {
      err.message = "获取版本信息失败：" + err.message;
      return Promise.reject(err);
    });
}

/**
 * 获取包的版本号信息
 * @param {string} npmName
 * @param {string} registry
 */
async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry);
  if (data) {
    return Object.keys(data.versions);
  } else {
    return [];
  }
}

/**
 * 过滤所有满足条件的版本号
 * @param {string} baseVersion
 * @param {array} versions
 */
function getSemverVersions(baseVersion, versions) {
  return versions
    .filter((version) => semver.satisfies(version, `^${baseVersion}`))
    .sort((a, b) => semver.gt(a, b));
}

/**
 * 获取比当前版本号大的版本信息
 * @param {string} baseVersion
 * @param {string} npmName
 * @param {string} registry
 * @returns
 */
async function getNpmSemverVersion(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry);
  const newVersions = getSemverVersions(baseVersion, versions);
  if (newVersions && newVersions.length > 0) {
    return newVersions[0];
  } else {
    return null;
  }
}

/**
 * 获取npm包最新的版本号
 * @param {string} npmName
 * @param {string} registry
 */
async function getNpmLatestVersion(npmName, registry) {
  let versions = await getNpmVersions(npmName, registry);
  if (versions && versions.length > 0) {
    return versions.sort((a, b) => semver.gt(a, b))[0];
  } else {
    return null;
  }
}

/**
 * 默认链接
 */
function getDefaultRegistry(isOriginal = false) {
  return isOriginal
    ? "https://registry.npmjs.org"
    : "https://registry.npm.taobao.org";
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersion,
  getDefaultRegistry,
  getNpmLatestVersion,
};
