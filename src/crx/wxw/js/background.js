/*
author:Ray
date:2017-9-20
*/
var background = function () {
    var _ = this;
    _.client = null;
    
    _.muid = 0;
    _.BUFFER_REQUEST_ACTS = ["get_gather_url_regexs"]
    _.bufferdRequestedDatas = {};

    _.init = function () {
        util.BG = this;
        util.setInstalledCookie();
        util.loadUrlRegexs(function () { });

        _.getLoginedMuid(function (muid) {
            _.client = new Client();
            _.client.Events.Message = _.onClientMessage;
            _.client.init(muid);
            _.updateLoginedStatus();
        });

        chrome.runtime.onMessage.addListener(
            function (message, sender, response) {
                if (message.act == "fetch_on_image") {
                    _.fetchToGatherBox(
                        message.url,
                        { 
                            action_from : message.action_from,
                            tabid : message.tabid,
                            rndid: message.rndid
                        },
                        response
                    )

                    return true;
                }
                else if (message.act == "request_wxw_server") {
                    // 制造可缓存的请求，这样避免服务器屡次被请求
                    var isNeedBufferd = _.BUFFER_REQUEST_ACTS.indexOf(message.data.act) > -1;
                    if (isNeedBufferd) {
                        if (_.bufferdRequestedDatas[message.data.act]) {
                            // 伪装请求结果直接返回
                            chrome.tabs.sendMessage(sender.tab.id, {
                                act: 'bg_http_response',
                                guid: message.guid,
                                data: _.bufferdRequestedDatas[message.data.act]
                            });

                            response();
                            return;
                        }
                    }

                    _.requestWxwServer(message.data, function (e) {
                        if (isNeedBufferd)
                            _.bufferdRequestedDatas[message.data.act] = e;

                        chrome.tabs.sendMessage(sender.tab.id, {
                            act: 'bg_http_response',
                            guid: message.guid,
                            data: e
                        });
                    });
                    response();
                }
        });

        chrome.browserAction.onClicked.addListener(function () {
            // 点击旺销王小图标
            _.onBrowserActionClicked();
        });

        _.createMenus();

        return this;
    }

    _.lastTab = null;

    // 不断更新已登录的账号
    _.updateLoginedStatus = function () {
        _.getLoginedMuid(function (muid) {
            _.muid = muid;

            if (muid != 0) {
                _.client.setClientId(muid);
            }
        });

        clearTimeout(_.h_uls);
        _.h_uls = setTimeout(function () {
            _.updateLoginedStatus();
        }, 1000);
    }

    _.onClientMessage = function (command, params) {
        // 收到下载指令
        if (command == "download") {
            _.getGatherHtml(params.url, function (html) {
                // 将HTML送至服务器
                var post = {
                    url: params.url,
                    post: params.post,
                    header: params.header,
                    encoding: params.encoding,
                    result: html,
                    watingkey: params.watingkey,
                    version: util.VERSION,
                };

                _.client.request("gather", post);
            }, params);
        }
    }

    // 采集内容并送至旺销王服务器
    _.sendHtmlToWxwServer = function (url, html, done) {
        _.getLoginedMuid(function (muid) {
            _.requestWxwServer({
                act: "add_to_gatherbox",
                muid: muid,
                url: url,
                html: html,
                version: util.version
            }, function (e) {
                done(e); // 全部采集完了
            });
        });
    }

    // 请求旺销王服务器
    _.requestWxwServer = function (data, done, async) {
        if (async == null)
            async = true;

        $.ajax({
            url: util.DOMAIN + "/do/",
            data: data,
            type: "post",
            async: async,
            success: function (json) {
                var e = {};

                try {
                    e = JSON.parse(json);
                } catch (e) {
                    return;
                }

                done(e);
            },
            error: function (e) {
                done({ success: false, message: "服务器请求发生异常，请查看控制台日志"});
            }
        });
    }

    _.getHistoryKey = function (url, post) {
        var key = url + JSON.stringify(post);
        return key;
    }

    _.gather_historys = []; // { url : "", html : "" }
    _.getGathedHistory = function (url, post) {
        // 移除掉多余的项目
        while (true) {
            if (_.gather_historys.length > 5)
                _.gather_historys.splice(0, 1);
            else
                break;
        }

        var key = _.getHistoryKey(url, post);
        for (var i = 0; i < _.gather_historys.length; i++) {
            var itm = _.gather_historys[i];

            if (itm.key == key) {
                return itm.html;
            }
        }

        return null;
    }

    _.GetRootDomain = function (url) {
        for (var fakeUrl in util.FAKE_GATHER_API) {
            if (url.indexOf(fakeUrl) > -1){
                url = url.replace(fakeUrl, util.FAKE_GATHER_API[fakeUrl]);
                break;
            }
        }

        return url;
    }

    // 采集
    _.getGatherHtml = function (url, done, e) {
        var RETRYS = 3;
        var type = "get";
        var post = {};

        if (e) {
            if (e.method) type = e.method;
            if (e.post) post = e.post;
        }

        console.log("DEBUG 0.0  getGatherHtml " + url);
        console.log("DEBUG 0.1  util.SUPPORT_WXWCLIENT_URL " + util.SUPPORT_WXWCLIENT_URL);

        if (wxwclient != null) {
            // 当采集链接属于
            var found = false;
            var matchUrl = "";
            var isRequestNetMessage = false;
            var account = null;

            for (var i = 0; i < util.SUPPORT_WXWCLIENT_URL.length; i++) {
                if (url.indexOf(util.SUPPORT_WXWCLIENT_URL[i]) > -1) {
                    matchUrl = util.SUPPORT_WXWCLIENT_URL[i];
                    found = true;

                    var platforms = Object.getOwnPropertyNames(
                        util.SUPPORT_WXWCLIENT_NETMESSAGE_URL);

                    console.log("DEBUG 1.0  platforms " + JSON.stringify(platforms));

                    for (var j = 0; j < platforms.length; j++) {
                        console.log("DEBUG 1.1   " + util.SUPPORT_WXWCLIENT_NETMESSAGE_URL[platforms[j]]);
                        console.log("DEBUG 1.2   " + url);

                        for (var m = 0; m < util.SUPPORT_WXWCLIENT_NETMESSAGE_URL[platforms[j]].length; m++) {
                            var NETMESSAGE_URL = util.SUPPORT_WXWCLIENT_NETMESSAGE_URL[platforms[j]][m];
                            console.log("DEBUG 1.3   " + NETMESSAGE_URL);

                            if (url.indexOf(NETMESSAGE_URL) > -1) {
                                isRequestNetMessage = true;
                                console.log("DEBUG 2.0  isRequestNetMessage " + JSON.stringify(isRequestNetMessage));
                                console.log("DEBUG 2.1  isRequestNetMessage " + JSON.stringify(util.GATHER_ACCOUNTS));
                                console.log("DEBUG 2.1  platform " + platforms[j]);

                                // 找出该平台的账户
                                for (var k = 0; k < util.GATHER_ACCOUNTS.length; k++) {
                                    if (util.GATHER_ACCOUNTS[k].platform == platforms[j]) {
                                        account = util.GATHER_ACCOUNTS[k];
                                        console.log("DEBUG 3.0  account " + JSON.stringify(account));
                                        break;
                                    }
                                }

                                break;
                            }
                        }
                    }

                    break;
                }
            }

            if (found) {
                var timeout = false;

                // 先尝试连接客户端，等待3秒
                wxwclient.connect(); // 尝试连接

                console.log("DEBUG 3.1 " );

                util.watingFor(function () {
                    if (wxwclient.connected) {
                        console.log("DEBUG 3.2 ");

                        chrome.cookies.getAll({ url: _.GetRootDomain(url) },
                            function (cookie) {
                                console.log("DEBUG 3.3 ");

                                if (isRequestNetMessage) {
                                    console.log("DEBUG 4.0");

                                    if (account == null) {
                                        console.log("没有可用的绑定账号");
                                        done(null);
                                        return;
                                    }

                                    console.log("DEBUG 5.0  " + JSON.stringify([account]));

                                    wxwclient.Post({
                                        act: "chrome_login",
                                        accounts: JSON.stringify([account])  // JSON.stringify(util.GATHER_ACCOUNTS)
                                    }, function (e) {
                                        console.log("DEBUG 5.1  " + JSON.stringify(e));

                                        if (e.success) {
                                            console.log("DEBUG 6.0  " + url);
                                            console.log("DEBUG 6.1  " + account.uid);
                                            console.log("DEBUG 6.2  " + JSON.stringify(account));

                                            wxwclient.Post({
                                                act: "load_request_net_message",
                                                url: url,
                                                uid: account.uid, // 用哪个账号呢？？
                                            }, function (e) {
                                                console.log("DEBUG 6.3  " + JSON.stringify(e));
                                                done(e.htmls.join("--------------"));
                                            });

                                        } else {
                                            console.log(e.message);
                                            done(null);
                                            return;
                                        }
                                    });
                                } else {
                                    console.log("DEBUG 7.0  ");

                                    wxwclient.Post({
                                        act: "post",
                                        url: e.url,
                                        encoding: e.encoding,
                                        header: e.header,
                                        post: e.post,
                                        cookie: JSON.stringify(cookie)
                                    }, function (e) {
                                        done(e.html);
                                    });
                                }
                            });
                    }
                }, function () {
                    return wxwclient.connected || timeout;
                });

                // 增加超时功能
                setTimeout(function ()
                {
                    if (!wxwclient.connected) {
                        timeout = true;
                        
                        var message = "当前未检测到旺销王客户端，<a href='#' target=_blank class=link>请下载并启动旺销王客户端</a>";

                        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                            _.showMessage(tabs[0].id, message, "error");
                        });

                        done(JSON.stringify({ success: false, message: message }));
                    }
                }, 3000); // 3秒后如果依然未链接则退出

                return;
            }
        }

        if (url == "COOKIE") {
            var pn = JSON.parse(e.post);

            chrome.cookies.get(pn,
                function (cookie) {
                try {
                    if (cookie != null) {
                        done(cookie.value);
                    }
                } catch (e) { }

                done("NO FOUND COOKIE");
            });
        }

        if (!e.retry) e.retry = 1;

        $.ajax({
            url: url,
            type: type,
            data: post,
            success: function (html) {
                if (html == null) html = "";

                if (util.getHtmlResultIsFailed(url, html)) {
                    if (e.retry > RETRYS) { // 重试3次依然不正确，则直接返回错误的内容。
                        if (html == null) html = "";

                        done(html);
                    }
                    else {
                        e.retry++;
                        setTimeout(function () {
                            _.getGatherHtml(url, done, e);
                        }, 1000 * e.retry);
                    }
                }
                else {
                    _.getHistoryKey(url, post);
                    done(html);
                }
            },
            error: function (e) {
                done(e.responseText);
            }
        });
    }
    
    _.notify = function (title, message, icon) {
        if (!icon)
            icon = "images/logo128.png";
        else
            icon = util.getAbsoluteUrl(icon);

        chrome.notifications.create("", {
            type: "basic",
            title: title,
            message: message,
            iconUrl: icon
        }, function (notificationId) { });
    }

    _.gatherAll = function (tabid) {
        chrome.tabs.sendMessage(tabid, {
            act: 'gatherall',
            tabid: tabid
        });
    }

    _.showMessage = function (tabid, text, type) {
        chrome.tabs.sendMessage(tabid, {
            act: 'showmessage',
            text: text,
            type: type
        });
    }

    _.showLoading = function (tabid, text) {
        chrome.tabs.sendMessage(tabid, {
            act: 'showloading',
            text: text
        });
    }

    _.closeLoading = function (tabid) {
        chrome.tabs.sendMessage(tabid, {
            act: 'closeloading'
        });
    }

    _.fetchToGatherBox = function (url, ex, response) {
        ex = ex || {};
        response = response || function(){};

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            var tab = null;

            for (var i = 0; i < tabs.length; i++) {
                if (tabs[i].url.indexOf("http") == 0) {
                    tab = tabs[i];
                }
            }

            _.lastTab = tab;
            var tabid = ex ? ex.tabid : 0;

            if (!tabid) tabid = tab.id;
            
            if (_.muid == 0) {
                _.showMessage(tabid, "您当前未登录旺销王，无法采集", "error");
                response(false);
                return;
            }

            if (tab == null) {
                _.showMessage(tabid, "找不到当前的浏览器标签页", "error");
                response(false);
                return;
            }

            if (!_.client.isConnected()) {
                _.showMessage(tabid, "未初始化连接", "error");
                response(false);
                return;
            }

            if (url == null)
                url = tab.url;

            if (url.indexOf("//") == 0) {
                var before = "http:";
                if (tab.url.indexOf("https") == 0) before = "https:";
                url = before + url;
            }

            if (url.indexOf("/") == 0) {
                var domain = "";
                var arr = tab.url.split("/");
                for (var i = 0; i < 3; i++) {
                    domain += arr[i];

                    if (i < 2)
                        domain += "/";
                }

                url = domain + url;
            }

            if (url.indexOf("/") == -1)
            {
                var domain = tab.url.replace("https://", "").replace("http://", "").split("/")[0];

                if (tab.url.indexOf("https") > -1)
                    url = "https://" + domain + "/" + url;
                else
                    url = "http://" + domain + "/" + url;
            }

            if (util.gatherUrlUseable(url)) {
                if (ex.action_from != "gather_all")
                        _.showLoading(tabid, "正在加入到采集箱..");

                // 开始采集
                _.requestWxwServer({
                    act: "add_to_gatherbox",
                    muid: _.muid,
                    url: url,
                    version: util.VERSION
                }, function (e) {
                    // 采集成功
                    if (ex.action_from != "gather_all") {
                        _.closeLoading(tabid);

                        if (!e.success){
                            _.showMessage(tabid, e.message, "error");
                            response(false);
                        }
                        else {
                            response(true);
                            _.notify("添加到旺销王采集箱成功", e.name, e.pic);
                        }
                    } else { // 通知采集下一个
                        chrome.tabs.sendMessage(tabid, {
                            act: 'gather_all_next',
                            rndid: ex.rndid
                        });
                    }
                });
            } else {
                // 尝试添加到采集箱
                if (ex.action_from != "gather_all") { // 怕无止境循环
                    _.gatherAll(tabid);
                }

                response(false);
            }
        });
    }

    _.createMenus = function () {
        chrome.contextMenus.create({
            title: "添加到旺销王采集箱",
            id: "mnuStartGather",
            onclick: function (tabs) {
                _.fetchToGatherBox();
            }
        });
    }

    _.onBrowserActionClicked = function () {
        chrome.tabs.create({
            url: chrome.runtime.getURL('index.html') // start //  打开本地页面（采集配置页）
        }, function (tab) {

        });
    }

    _.getLoginedMuid = function (done) {
        var muid = 0;
        chrome.cookies.get({
            url: util.DOMAIN,
            name: "wxw10"
        }, function (cookie) {
            try {
                if (cookie != null) {
                    var cookie_vals = cookie.value.split("&");
                    for (var i = 0; i < cookie_vals.length; i++) {
                        if (cookie_vals[i].indexOf("muid=") >= 0) {
                            muid = cookie_vals[i].replace("muid=", "");
                            done(muid);
                            return;
                        }
                    }
                }
            } catch (e) { }
            done(0);
        });
    }
}

var BG = new background().init();