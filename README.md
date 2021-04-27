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

add this to your .env.local

```env
ftpHost = your-ftp-host
ftpPort = your-ftp-port
ftpUsr  = your-ftp-username
ftpPwd  = your-ftp-password
```

or 

```env
VUE_APP_ftpHost = your-ftp-host
VUE_APP_ftpPort = your-ftp-port
VUE_APP_ftpUsr  = your-ftp-username
VUE_APP_ftpPwd  = your-ftp-password
```

example

```env
VUE_APP_ftpHost = 127.0.0.1
VUE_APP_ftpPort = 21
VUE_APP_ftpUsr  = usr@localhost
VUE_APP_ftpPwd  = pwdpwdpwd
```

## Default Settings

default `ftpdeploy/config.js`

```js
module.exports = {
  localBasePath: "/",
  remoteBasePath: "/",
  sync: [{ src: "/dist", dest: "/" }]
};
```

By default, will upload everything in /dist folder to base path of your remote server.

## Usage

add more settings in `ftpdeploy/config.js`

```js
module.exports = {
  localBasePath: "/",
  remoteBasePath: "/test_ftp_deploy/",
  del: ["/folder0/", "/folder1", "folder2", "folder3/folder4"],
  // folder0, folder1, folder2, folder4 on remote server will be deleted
  clear: ["folder5", { dir: "folder6", test: "*.js" }],
  // folder5 will be empty, folder6's all .js files will be deleted
  // `test` use minimatch to match
  create: ["folder7", "folder8/folder9", { dir: "folder10", perm: "777" }],
  // create folder7, folder8, folder8/folder9, folder10 with permission 777 (chmod command)
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
The plugin will delete, clear, create then upload.

## Config.js Setting

| Parameters     | Detail                                           |
| -------------- | ------------------------------------------------ |
| localBasePath  | local path relative to project path              |
| remoteBasePath | remote path on the server                        |
| del            | array of directory to delete                     |
| clear          | array of directory to clear it's content         |
| create         | array of directory to create                     |
| sync           | array of source ==> destination folder to upload |

## Vue UI Setting

| Parameters                      | Default Value | Detail                                                     |
| ------------------------------- | ------------- | ---------------------------------------------------------- |
| `config.js` location            | /ftpdeploy/   | setting file                                               |
| path to write `hist.json`       | /ftpdeploy/   | md5 of file content, use for upload changed file only mode |
| gen file checksum               | true          | save md5 of uploaded files as hist.json                    |
| upload diff file from hist only | true          | will upload only changed file only                         |

![Sample UI Image](https://i.imgur.com/sCrBEJe.jpg "Sample UI Image")

## Command Line Setting

Add command to 'scripts' part of `package.json`

```js
  "scripts": {
    "serve": "vue-cli-service serve",
    "build": "vue-cli-service build",
    "deploy": "vue-cli-service ftpdeploy --genHist --diffFileOnly --ftpCfgPath /ftpdeploy/ --ftpHistPath /ftpdeploy/"
  },
```

Now you can

```sh
npm run deploy
```

or

```sh
yarn deploy
```

## Deploy to Multiple Sites

An example for different build configuration and different deploy target i.e. `site2`

`.env.site2.local`

```env
NODE_ENV=production
VUE_APP_ftpHost = 127.0.0.2
VUE_APP_ftpPort = 21
VUE_APP_ftpUsr  = usr2@localhost
VUE_APP_ftpPwd  = pwd2pwd2pwd2
```

Add another `build` command to 'scripts' part of `package.json`
to build with `site2` mode which will use above env file and set `/site2` as built destination.

Add another `deploy` command to 'scripts' part of `package.json`
to deploy with `site2` mode and use `/ftpdeploy_site2` as configuartion directory.

```js
  "scripts": {
    "serve": "vue-cli-service serve",
    "build": "vue-cli-service build",
    "deploy": "vue-cli-service ftpdeploy --genHist --diffFileOnly --ftpCfgPath /ftpdeploy/ --ftpHistPath /ftpdeploy/",
    "build:site2": "vue-cli-service build --mode site2 --dest site2",
    "deploy:site2": "vue-cli-service ftpdeploy --mode site2 --genHist --diffFileOnly --ftpCfgPath /ftpdeploy_site2/ --ftpHistPath /ftpdeploy_site2/"
  },
```

then duplicate `/ftpdeploy` or create another folder i.e. `/ftpdeploy_site2`
and change `/ftpdeploy_site2/config.js` to 

```js
module.exports = {
  localBasePath: "/",
  remoteBasePath: "/",
  sync: [{ src: "/site2", dest: "/" }]
};
```

Now you can

```sh
npm run deploy:site2
```
or
```sh
npm run build:site2 && npm run deploy:site2
```
