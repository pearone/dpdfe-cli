"use strict";
const ora = require("ora");
const cp = require("child_process");

function isObject(o) {
  return Object.prototype.toString.call(o) === "[object Object]";
}

async function Spinner({ text }) {
  const spinner = ora({
    text: text ?? "process..",
  });

  return spinner;
}

function sleep(timeout = 1000) {
  return new Promise((resolver) => {
    setTimeout(resolver, timeout);
  });
}

function spawn(command, args, options) {
  const win32 = process.platform === "win32";
  const cmd = win32 ? "cmd" : command;
  const cmdArgs = win32 ? ["/c"].concat(command, args) : args;
  return cp.spawn(cmd, cmdArgs, options || {});
}

function spawnAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    const p = spawn(command, args, options);
    p.on("error", (e) => {
      reject(e);
    });
    p.on("exit", (c) => {
      resolve(c);
    });
  });
}

module.exports = {
  isObject,
  Spinner,
  sleep,
  spawn,
  spawnAsync,
};
