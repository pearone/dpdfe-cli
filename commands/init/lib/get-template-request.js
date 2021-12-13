const request = require("@pear-cli/request");

// module.exports = () => {
//   return request({
//     url: "/template",
//   });
// };

module.exports = () => {
  return Promise.resolve([
    {
      description: "项目基础模版",
      name: "dpd-cli-template",
      version: "1.0.0",
      type: "normal", // normal、custom
      installCommand: "npm install",
      startCommand: "npm run dev",
    },
  ]);
};
