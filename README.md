# vue-cli-plugin-ftp-deploy
vue-cli-plugin for deploying via ftp

## Installation
via command line
```sh
vue add ftp-deploy
```
via Vue UI
```
Click Plugins -> Add plugin
search for ftp-deploy
install it
*** don't forget to click 'Finish installation' to generate config file
```
the plugin will generate `ftpdeploy` folder and `config.js` inside
## Before Use

add this to your .env
```env
ftpHost = your-ftp-host
ftpPort = your-ftp-port
ftpUsr  = your-ftp-username
ftpPwd  = your-ftp-password
```

example

```env
ftpHost = 127.0.0.1
ftpPort = 21
ftpUsr  = usr@localhost
ftpPwd  = pwdpwdpwd
```

## Usage
edit `ftpdeploy/config.js`

```js
module.exports = {
  localBasePath:"/",
  remoteBasePath: "/test_ftp_deploy/",
  del: ["/folder0/","/folder1", "folder2", "folder3/folder4"],
  // folder0, folder1, folder2, folder4 on remote server will be deleted
  clear: ["toClear1", { dir: "toClear2", test: "*.js" }],
  // folder toClear1 will be empty, folder toClear2's all .js files will be deleted
  // `test` use minimatch to match
  sync: [
    { src: { dir: "/dist", ignore: "dist/css/**" }, dest: "/" },
    // `ignore` use glob to match
    { src: "/api", dest: "/api/" },
    { src: "foo/cfg", dest: "/cfg" }
  ]
};
```
More info about [minimatch](https://www.npmjs.com/package/minimatch) here.

More info about [glob pattern](https://www.npmjs.com/package/glob#glob-primer) here.

## Config.js Setting

| Parameters | Detail |
| ------ | ------ |
| localBasePath | local path relative to project path |
| remoteBasePath | remote path on the server |
| del | array of directory to delete  |
| clear | array of directory to clear it's content
| sync | array of source <==> destination folder to sync  |


## Vue UI Setting
| Parameters | Default Value | Detail |
| ------ | ------ | ------ |
| `config.js` location | /ftpdeploy/ | setting file |
path to write `hist.json`  | /ftpdeploy/ | md5 of file content, use for upload changed file only mode |
| gen file checksum | true | save md5 of uploaded files as hist.json|
| upload diff file from hist only | true | will upload only changed file only|


![Sample UI Image](https://i.imgur.com/sCrBEJe.jpg "Sample UI Image")