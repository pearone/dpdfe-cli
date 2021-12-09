const request = require("@dpd-cli/request");

// module.exports = () => {
//   return request({
//     url: "/template",
//   });
// };

module.exports = () => {
  return [
    {
      description: "项目基础模版",
      name: "dpd-cli-template",
      version: "1.0.0",
      type: "normal",
      installCommand: "npm install",
      startCommand: "npm run dev",
    },
    {
      description: "管理后台模版",
      name: "dpd-cli-template",
      version: "1.0.0",
      type: "custom",
    },
  ];
};
