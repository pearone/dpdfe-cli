"use strict";

const log = require("npmlog");

log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info"; // 判断debug模式

log.heading = "pear-cli";
log.headingStyle = { fg: "red", bg: "black" };

log.addLevel("success", 2000, { fg: "green", bold: true });
log.addLevel("info", 2000, { fg: "blue", bold: true });

module.exports = log;
