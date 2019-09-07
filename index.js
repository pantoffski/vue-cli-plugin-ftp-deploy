const chalk = require("chalk");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const Ftp = require("jsftp");
const minimatch = require("minimatch");
const ABS_BASE_PATH = process.env.VUE_CLI_CONTEXT ? process.env.VUE_CLI_CONTEXT : process.cwd();
const IS_FILE = 0;
const IS_DIR = 1;
let cfg, ftp, avalDir, avalFile, hist, mdFive;
module.exports = (api, projectOptions) => {
  api.registerCommand("ftpdeploy", async args => {
    resetVars();
    if (!args.ftpCfgPath) {
      console.log(chalk.red("No config file path !"));
      return;
    }
    let fPath = path.join(ABS_BASE_PATH, args.ftpCfgPath, "config.js");
    if (!fs.existsSync(fPath)) {
      console.log(chalk.bgRed.white("ftpdeploy `config.js` not found"));
      return;
    }
    try {
      cfg = require(fPath);
    } catch (e) {
      console.log(chalk.bgRed.white("Mulform config"));
      return;
    }

    if (!process.env.ftpHost) {
      console.log(chalk.bgRed.white("No `ftpHost` defined in .env"));
      return;
    }
    if (!process.env.ftpPort) {
      console.log(chalk.bgRed.white("No `ftpPort` defined in .env"));
      return;
    }
    if (!process.env.ftpUsr) {
      console.log(chalk.bgRed.white("No `ftpUsr` defined in .env"));
      return;
    }
    if (!process.env.ftpPwd) {
      console.log(chalk.bgRed.white("No `ftpPwd` defined in .env"));
      return;
    }
    cfg["ftpHost"] = process.env.ftpHost;
    cfg["ftpPort"] = process.env.ftpPort;
    cfg["ftpUsr"] = process.env.ftpUsr;
    cfg["ftpPwd"] = process.env.ftpPwd;
    cfg["remoteBasePath"] =
      (cfg["remoteBasePath"].charAt(0) == "/" ? "" : "/") + cfg["remoteBasePath"];
    cfg["remoteBasePath"] =
      cfg["remoteBasePath"].slice(-1) == "/"
        ? cfg["remoteBasePath"].slice(0, -1)
        : cfg["remoteBasePath"];
    cfg["localBasePath"] = cfg["localBasePath"] ? cfg["localBasePath"] : "/";
    cfg["absBasePath"] = ABS_BASE_PATH;
    cfg["genHist"] = args.genHist ? true : false;
    cfg["diffFileOnly"] = args.diffFileOnly ? true : false;
    //console.log(cfg);

    if (args.ftpHistPath) {
      let histPath = path.join(cfg["absBasePath"], args.ftpHistPath, "hist.json");
      if (fs.existsSync(histPath)) hist = JSON.parse(fs.readFileSync(histPath, "utf8"));
    }

    ftp = await ftpInit(cfg);
    if (!ftp) {
      console.log(chalk.bgRed.white("Error Connectting"));
      return;
    }
    if (cfg["del"])
      for (let i = 0; i < cfg["del"].length; i++) {
        await ftpDelDir(cfg["del"][i]);
      }
    if (cfg["clear"])
      for (let i = 0; i < cfg["clear"].length; i++) {
        let o = cfg["clear"][i];
        if (typeof o == "string") await ftpDelDir(o, null, "clear");
        else await ftpDelDir(o.dir, o.test, "clear");
      }
    if (cfg["create"]) {
      await ftpMkRemoteBasePath();
      for (let i = 0; i < cfg["create"].length; i++) {
        let o = cfg["create"][i];
        await ftpMkDir(o);
      }
    }
    if (cfg["sync"]) {
      await ftpMkRemoteBasePath();
      for (let i = 0; i < cfg["sync"].length; i++) {
        await ftpSync(cfg["sync"][i]);
      }
    }
    await ftpQuit();
    if (args.ftpHistPath && cfg["genHist"]) {
      let histPath = path.join(cfg["absBasePath"], args.ftpHistPath, "hist.json");
      fs.writeFileSync(histPath, JSON.stringify(mdFive), "utf8");
    }
    resetVars();
    console.log(chalk.bgGreen("---- Done ----"));
  });
};
function resetVars() {
  ftp = null;
  cfg = {};
  avalDir = {};
  avalFile = {};
  hist = {};
  mdFive = {};
}
async function ftpSync(o) {
  let files,
    src,
    dest = o.dest;
  globOpt = {};
  if (typeof o.src == "string") {
    src = o.src;
  } else {
    src = o.src.dir;
    globOpt = {
      ignore: path
        .join(cfg["localBasePath"], o.src.ignore)
        .split(/[\\\/]/)
        .join("/")
    };
  }

  src = path
    .join(cfg["localBasePath"], src)
    .split(/[\\\/]/)
    .join("/");
  src = src.charAt(0) == "/" ? src.substr(1) : src;
  src = src.slice(-1) == "/" ? src.slice(0, -1) : src;
  if (globOpt.ignore) {
    globOpt.ignore = globOpt.ignore.charAt(0) == "/" ? globOpt.ignore.substr(1) : globOpt.ignore;
    globOpt.ignore = globOpt.ignore.slice(-1) == "/" ? globOpt.ignore.slice(0, -1) : globOpt.ignore;
  }
  dest = src.charAt(0) == "/" ? dest.substr(1) : dest;

  files = [src, src + "/**", src + "/.*"].reduce(function(acc, globString) {
    var globFiles = glob.sync(globString, globOpt);
    return acc.concat(globFiles);
  }, []);

  files = files.filter(f => {
    return fs.lstatSync(path.join(cfg["absBasePath"], f)).isFile();
  });

  files = files.map(f => {
    return {
      src: path.join(cfg["absBasePath"], f),
      dest: path
        .join(cfg["remoteBasePath"], dest, f.replace(src, ""))
        .split(/[\\\/]/)
        .join("/")
    };
  });
  for (let i = 0; i < files.length; i++) {
    await doFtpUpload(files[i].src, files[i].dest);
  }
}
async function doFtpUpload(localPath, remotePath) {
  return new Promise(async resolve => {
    let localFile = fs.readFileSync(localPath);
    if (cfg["genHist"])
      mdFive[remotePath] = crypto
        .createHash("md5")
        .update(
          localFile
            .toString("utf8")
            .replace(/\r/g, "")
            .replace(/\n/g, "")
        )
        .digest("hex");
    let dir = path.dirname(remotePath);
    if (!avalFile[dir]) {
      let ls = await ftpListDir(dir);
      avalFile[dir] = true;
      if (ls)
        for (let i = 0; i < ls.length; i++) {
          let target = path
            .join(dir, ls[i].name)
            .split(/[\\\/]/)
            .join("/");
          if (ls[i].type == IS_FILE) avalFile[target] = true;
        }
    }

    if (cfg["diffFileOnly"] && avalFile[remotePath] && mdFive[remotePath] == hist[remotePath]) {
      resolve(false);
      return;
    }
    await ftpMkDir(path.dirname(remotePath));
    ftp.put(localFile, remotePath, err => {
      if (err) {
        console.log(chalk.bgRed.white(err));
        resolve(false);
        return;
      }
      console.log(chalk.green("up  :", remotePath));
      resolve(true);
    });
  });
}
async function ftpDelDir(_dir, test = null, opType = "del") {
  let dir = absRemotePath(_dir);
  return new Promise(async resolve => {
    let ls = await ftpListDir(dir);
    if (ls) {
      for (let i = 0; i < ls.length; i++) {
        let target = path
          .join(dir, ls[i].name)
          .split(/[\\\/]/)
          .join("/");
        if (ls[i].type == IS_DIR) await ftpDelDir(target, test, opType);
        else await doFtpDelFile(target, test);
      }
      if (opType == "del") await doFtpDelEmptyDir(dir);
    }
    resolve(true);
  });
}
function doFtpDelFile(_target, test = null) {
  let target = absRemotePath(_target);
  let fName = path.basename(target);
  return new Promise(resolve => {
    if (test && !minimatch(fName, test)) {
      resolve(false);
      return;
    }
    ftp.raw("dele", target, err => {
      if (err) {
        console.log(chalk.bgRed.white(err));
        resolve(false);
        return;
      }
      console.log(chalk.red("del :", target));
      resolve(true);
    });
  });
}
async function doFtpDelEmptyDir(_dir) {
  let dir = absRemotePath(_dir);
  return new Promise(async resolve => {
    ftp.raw("rmd", dir, err => {
      if (err) {
        console.log(chalk.bgRed.white(err));
        resolve(false);
        return;
      }
      console.log(chalk.red.underline("rmd :", dir));
      resolve(true);
    });
  });
}
function ftpListDir(_dir) {
  let dir = absRemotePath(_dir);
  return new Promise(resolve => {
    ftp.raw("cwd", dir, err => {
      if (err) {
        resolve(null);
        return;
      }
      ftp.ls(dir, (err, data) => {
        if (err) {
          resolve([]);
          return;
        }
        var ret = [];
        data.forEach(e => {
          ret.push({ name: e.name, type: e.type });
        });
        resolve(ret);
      });
    });
  });
}
async function ftpMkDir(_dir) {
  let dir = absRemotePath(typeof _dir == "string" ? _dir : _dir.dir);
  let incDir = "";
  let dirs = dir.split(/[\\\/]/);
  for (let i = 0; i < dirs.length; i++) {
    incDir += dirs[i] + "/";
    await doFtpMkDir(incDir);
  }
  if (typeof _dir != "string") await doFtpChmod(dir, _dir.perm);
  return 0;
}
async function ftpMkRemoteBasePath() {
  let dirs = cfg["remoteBasePath"].split(/[\\\/]/);
  let incDir = "";
  for (let i = 0; i < dirs.length; i++) {
    incDir += dirs[i] + "/";
    await doFtpMkDir(incDir);
  }
}
function doFtpChmod(dir, perm) {
  return new Promise(resolve => {
    ftp.raw("site", "chmod", perm, dir, err => {
      if (err) {
        console.log(chalk.bgRed.white("chmod error"));
        console.log(chalk.bgRed.white(err));
        resolve(false);
        return;
      }
      console.log(chalk.yellow("chmod :", perm, dir));
      resolve(true);
    });
  });
}
function doFtpMkDir(dir) {
  return new Promise(resolve => {
    if (dir in avalDir) {
      resolve(true);
      return;
    }
    ftp.raw("cwd", dir, err => {
      if (err) {
        ftp.raw("mkd", dir, err => {
          if (err) {
            console.log(chalk.bgRed.white(err));
            resolve(false);
            return;
          }
          console.log(chalk.green.underline("mkd :", dir));
          avalDir[dir] = true;
          resolve(true);
        });
      } else {
        avalDir[dir] = true;
        resolve(true);
      }
    });
  });
}
function ftpInit(cfg) {
  return new Promise(resolve => {
    let _ftp = new Ftp({ host: cfg.ftpHost, port: cfg.ftpPort });
    _ftp.auth(cfg.ftpUsr, cfg.ftpPwd, err => {
      if (err) {
        resolve(null);
      } else {
        resolve(_ftp);
      }
    });
  });
}
function ftpQuit() {
  return new Promise(resolve => {
    ftp.raw("quit", (err, data) => {
      if (err) console.log(chalk.bgRed.white(err));
      resolve();
    });
  });
}
function absRemotePath(_dir) {
  return _dir.indexOf(cfg.remoteBasePath)
    ? path
        .join(cfg.remoteBasePath, _dir)
        .split(/[\\\/]/)
        .join("/")
    : _dir;
}
