const request = require("@dpd-cli/request");

module.exports = () => {
  return request({
    url: "/template",
  });
};
