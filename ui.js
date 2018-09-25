module.exports = api => {
  api.addTask({
    name: "FtpDeploy",
    icon: "https://material.io/tools/icons/static/icons/baseline-account_balance-24px.svg",
    command: "vue-cli-service ftpdeploy",
    description: "ftp deploy to target server",
    prompts: [
      {
        name: "ftpCfgPath",
        type: "input",
        default: "/ftpdeploy/",
        description: "`config.js` location"
      },
      {
        name: "ftpHistPath",
        type: "input",
        default: "/ftpdeploy/",
        description: "path to write `hist.json`"
      },
      {
        name: "genHist",
        type: "confirm",
        default: "true",
        description: "gen file checksum"
      },
      {
        name: "diffFileOnly",
        type: "confirm",
        default: "true",
        description: "upload diff file from hist only"
      }
    ],
    onBeforeRun: async ({ answers, args }) => {
      if (answers.genHist) args.push("--genHist");
      if (answers.diffFileOnly) args.push("--diffFileOnly");
      if (answers.ftpCfgPath) args.push("--ftpCfgPath", answers.ftpCfgPath);
      if (answers.ftpHistPath) args.push("--ftpHistPath", answers.ftpHistPath);
    }
  });
};
