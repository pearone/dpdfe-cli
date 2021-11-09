#! /usr/bin/env node

const importLocal = require("import-local");

if (importLocal(__filename)) {
  require("npmlog").log("dpd-cli", "进入cli");
} else {
  require("../lib")(process.argv.slice(2));
}
