"use strict";

import path from 'path'
import fs from "fs"
import {
  app,
  BrowserWindow,
  Menu,
  protocol,
  dialog
} from 'electron'
import i, { IState } from './er/codeadmin/iglobal'
// import {
//   createProtocol
//   /* installVueDevtools */
// } from "vue-cli-plugin-electron-builder/lib";
let win: BrowserWindow
declare global {
  namespace NodeJS {
    interface Global {
      istate: IState
    }
  }
}
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } }
]);

function setState(lastUrl: string) {
  global.istate.user.lastUrl = lastUrl;
  //win.webContents.getURL();//最后网址
  return i.setState(global.istate);
}

// app.on("activate", () => {
//  //当应用被激活时发出。 各种操作都可以触发此事件, 例如首次启动应用程序、尝试在应用程序已运行时或单击应用程序的坞站或任务栏图标时重新激活它。
// });

// const extensions = new ExtensibleSession();
app.on("ready", async () => i.getState().then(
  v => {
    global.istate = v;
    // require('electron').remote.getGlobal('istate').db = 'new value'
    const m = Menu.buildFromTemplate(v.menu);
    console.log(v, m)
    Menu.setApplicationMenu(m);
    // let c = global.istate.srcInsert.crxDirName.map(async v => await extensions.loadExtension(`${__dirname}${v}`));
    // Promise.all(c);
    createWindow()
  }).catch(
    console.error
  )
)

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // if (process.platform !== "darwin") {
  app.quit();
  // }
  setState(win.webContents.getURL()).then(app.quit)
});

function createWindow(): void {
  // app.isPackaged//返回一个Boolean值，如果应用已经打包，返回true ，否则返回false 。 对于大多数应用程序，此属性可用于区分开发和生产环境。 
  let src = global.istate.srcInsert;
  if (src.jsPath && global.istate.browserWindowConstructorOptions.webPreferences) {
    global.istate.browserWindowConstructorOptions.webPreferences['preload'] = path.resolve(
      __dirname, 'er', ...src.jsPath
    )
  }
  win = new BrowserWindow(global.istate.browserWindowConstructorOptions);
  win.loadURL(...global.istate.loadURL);
  win.webContents.openDevTools({ mode: 'detach' });
  win.webContents.on("did-finish-load", () => {
    if (src.cssPath) {
      let cp = path.resolve(__dirname, 'er', ...src.cssPath);
      let css = fs.readFileSync(cp).toString();
      win.webContents.insertCSS(css);
    }
    win.webContents.executeJavaScript(src.jsCode)
  })

  // 监听新窗口
  win.webContents.on("new-window", function (e, url) {
    //阻止
    e.preventDefault();
    setState(url);
    //让它在主窗口打开，不然没法监听新窗口
    win.loadURL(url);
  })
}


// Exit cleanly on request from parent process in development mode.
// if (process.env.NODE_ENV !== "production") {
//   if (process.platform === "win32") {
//     process.on("message", data => {
//       if (data === "graceful-exit") {
//         app.quit();
//       }
//     });
//   } else {
//     process.on("SIGTERM", () => {
//       app.quit();
//     });
//   }
// }
