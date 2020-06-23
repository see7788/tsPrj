import ElectronStore from 'electron-store'
import path from 'path'
import CryptoJS from 'crypto-js'
import {
    BrowserWindowConstructorOptions,
    MenuItemConstructorOptions,
    MenuItem,
    LoadURLOptions
} from 'electron'
import { machineIdSync } from 'node-machine-id'
import axios from 'axios'
let electronStore = new ElectronStore();
type JsEr = 'xiaoxin' | 'linyizhou';
export interface IState {
    user: {
        id: string
        tel: string
        socket?: WebSocket
        shops: {
            [shopname: string]: {
                shoppassword: string
            }
        }
        lastUrl: string
        proPostNumber: number
        cartPostNumber: number,
    },
    db: {
        [md5TopUrl_proid in string | number]: {
            proid: string
            title: string
            price: number
            pic: string
            url: string
        }
    },
    adminEr: {
        users: Array<Pick<IState['user'], 'id' | 'tel' | 'shops'>>
        products: {
            [shopnam: string]: {
                datetime: TimeRanges
                db: IState['db']
            }
        }
    }
    browserWindowConstructorOptions: BrowserWindowConstructorOptions
    menu: Array<MenuItemConstructorOptions | MenuItem>,
    srcInsert: {
        crxDir: Array<'wxw'>
        jsPath: [JsEr, 'get.js' | 'use.js' | 'public.js']
        jsCode: string | ''
        cssPath: [JsEr, 'get.css' | 'use.css' | 'public.css']
    },
    loadURL: [string, LoadURLOptions?],
}
let cachestate = electronStore.get('istate');
let defstate: IState = {
    // path: path.join(path.resolve(), '@/static/useConfig.json'),
    user: {
        id: '',//需注册
        tel: '',//需登录
        lastUrl: '',
        proPostNumber: 0,
        cartPostNumber: 0,
        shops: {}
    },
    adminEr: {
        users: [],
        products: {},
    },
    browserWindowConstructorOptions: {
        width: 500,
        height: 500,
        webPreferences: {
            javascript: true,
            plugins: true,
            nodeIntegration: false,//node的功能
            preload: ''
        },
    },
    loadURL: ['https://s.taobao.com/', {}],
    srcInsert: {
        crxDir: [],
        jsCode: '',
        jsPath: ['xiaoxin', 'use.js'],
        cssPath: ['xiaoxin', 'use.css']
    },
    db: {},
    menu: [
        {
            label: '购物车',
            click: () => 'demo.js'
        },
        {
            label: '刷新',
            click: () => 'mainWindow?.webContents.reload()'
        },
        {
            label: '后退',
            click: () => 'mainWindow?.webContents.goBack()'
        },
        {
            label: '向前',
            click: () => 'mainWindow?.webContents.goForward()'
        },
        {
            label: '淘宝',
            click: () => 'https://s.taobao.com/'
        },
        {
            label: '敦煌',
            click: () => 'https://www.dhgate.com/#hp-head-8',
        }
    ]
}
const state: IState = cachestate ? cachestate : defstate;
const configConst = {
    httpServe: 'https://shuzijia.net/index/electron/',
    setState: (istate: IState): Promise<any> => new Promise(() => electronStore.set({ istate })),
    user: {
        需注册url: path.resolve(__dirname, 'demo.html'),//请输入我的手机号->等客服开通-》等待通过
        需登录url: path.resolve(__dirname, 'demo.html'),//输入我的手机号->登录
        postLogin: async (tel: string = ''): Promise<IState> => {
            // let nowid = machineIdSync();
            // console.log(nowid);
            const id = 'id';
            axios.defaults.timeout = 10000;
            axios.defaults.withCredentials = true;
            axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8;';
            return axios.post(
                configConst.httpServe + 'd1logintoekn',
                { tel, id },
            ).then(
                ({ data }) => {
                    if (data['id'] && data['id'] == id) {
                        state.user.id = id
                        if (data['tel']) {
                            state.user.tel = data['tel']
                            state.loadURL = [state.user.lastUrl];
                        } else {
                            state.loadURL = [configConst.user.需注册url];
                        }
                    } else {
                        state.user.id = ''
                        state.loadURL = [configConst.user.需登录url];
                    }
                    createSocket().then((v) => configConst.setState(state));
                    return state;
                }
            )
        },
        // postRegister: (tel: string = ''): Promise<IState> => configConst.loginToken(tel),
        // postStatedb: (tel: string = ''): Promise<any> => {
        // },
    }
} as const;

const createSocket = () => {
    return new Promise((ok) => {
        let host = configConst.httpServe + 'd1SocketServe';
        let ws = new WebSocket(host);
        ws.onclose = () => { ws.send(host) }
        ws.onmessage = ({ data }) => {
            let { type, msg } = CryptoJS.enc.Base64.parse(data).toString(CryptoJS.enc.Utf8);
        }
        ws.onerror = () => ws.send(host);
        ws.onopen = () => {
            ws.send(host);
            setInterval(function () {
                ws.send(JSON.stringify({ heart: 'xd' }))// 心跳包，30s左右无数据浏览器会断开连接Heartbeat
            }, 30000);
        }
        state.user.socket = ws;
        ok()
    });
}

export default {
    getState: configConst.user.postLogin,
    setState: configConst.setState,
}
