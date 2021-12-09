"use strict";

const path = require("path");

module.exports = formatPath;

/**
 * 路径的兼容（macOS/windows）
 * @param {string} p
 * @returns
 */
function formatPath(p) {
  if (p && typeof p === "string") {
    const sep = path.sep;
    if (sep === "/") {
      return p;
    } else {
      return p.replace(/\\/g, "/");
    }
  }
  // TODO
  return p;
}
