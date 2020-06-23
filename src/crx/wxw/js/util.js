var Util = function () {
    var _ = this;
    
    _.VERSION = "4.1.2";
    //  _.DOMAIN = "http://localhost:11688";
    _.DOMAIN = "https://www.wxwerp.com";

    _.ISDEBUG = true;

    _.WS_HOST = "localhost:30002";
      
    _.IS_LOADED_REGEXS = false;
    _.SUPPORT_WXWCLIENT_URL = [];
    _.SITE_FAILED_KEYWORDS = {};
    _.SITE_UI_INJECT_EXCLUDE = [];
    _.GATHER_REGEXS = {};
    _.FAKE_GATHER_API = {};
    
    _.BG = null; // UI 就没有bg

    _.getSingleton = function(fn){
        var result;

        return function(){
            return result || (result = fn.apply(this, arguments));
        }
    }

    _.trim = function(str){
        return str.replace(/ *[\r|\n] */gm, "");
    }

    _.parseParam = function (param, key) {
        var paramStr = "";
        if (typeof param === "string" || typeof param === "number" || typeof param === "boolean") {
            paramStr += "&" + key + "=" + encodeURIComponent(param);
        } else {
            $.each(param, function (i) {
                var k = key == null ? i : key + (Object.prototype.toString.call(param) === "[object Array]" ? "[" + i + "]" : "." + i);
                paramStr += '&' + _.parseParam(this, k);
            });
        }
        return paramStr.substr(1);
    };

    _.getAbsoluteUrl = function (url) {
        if (url.indexOf("//") == 0) {
            var before = "http:";

            url = before + url;
        }
        return url;
    }

    _.msgs = {};
    _.init = function () {
        _.DOMAIN = _.DOMAIN
            .replace(/_t\(['"`]/g, "")
            .replace(/['"`]\)/g, "");

        chrome.runtime.onMessage.addListener(
            function (message, sender, response) {
                if (message.act == "bg_http_response") {
                    _.msgs[message.guid] = message.data;
                }
            });
    }

    _.requestWxwServer = function (data, done) {
        if (_.BG) {
            _.BG.requestWxwServer(data, done);
        } else {
            var guid = Math.round(Math.random() * 1000000000);

            chrome.runtime.sendMessage({
                act: "request_wxw_server",
                data: data,
                guid: guid
            },

            function (result) {
                _.watingFor(function () {
                    done(_.msgs[guid]);
                    _.msgs[guid] = null;
                }, function () {
                    return _.msgs[guid] != null;
                });
            });
        }
    }

    _.watingFor = function (runCallback, watingCallback, args) {
        args = args || {};
        if (args.sleep == null) args.sleep = 300;
        var sleep = args.sleep;
        if (!args._runned) sleep = 1;
        args._runned = true;

        setTimeout(function () {
            if (watingCallback(args)) {
                runCallback(args);
            } else {
                _.watingFor(runCallback, watingCallback, args);
            }
        }, sleep);
    }

    _.getHtmlResultIsFailed = function (url, html) {
        for (var key in _.GATHER_REGEXS){
            if (url.indexOf(key) > -1) {
                if (_.SITE_FAILED_KEYWORDS[key]) {
                    for (var i = 0; i < _.SITE_FAILED_KEYWORDS[key].length; i++) {
                        var keyword = _.SITE_FAILED_KEYWORDS[key][i];
                        var regExp = new RegExp(keyword, 'ig');
                        if (regExp.test(html)) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    _.isUiInjectExclude = function(url){
        var ret = false;
        for (var i = 0,site; site = _.SITE_UI_INJECT_EXCLUDE[i++];){
            if (url.indexOf(site) > -1){
                ret = true;
                break; 
            }
        }
        return ret;
    }

    _.gatherSiteUseable = function (url) {
        var gatherRegexs = _.GATHER_REGEXS;

        for(var key in gatherRegexs) {
            if (url.indexOf(key) > -1) {
                return true;
            }
        }

        return false;
    }

    _.gatherUrlUseable = function (url, site) {
        site = site || "";
        var gatherRegexs = _.GATHER_REGEXS;
        var urlRegexs = [];

        for (var key in gatherRegexs) {
            if (url.indexOf(key) > -1) {
                urlRegexs = gatherRegexs[key];
                break;
            }
        }

        for (var i = 0; i < urlRegexs.length; i++) {
            var regExp = new RegExp(urlRegexs[i], 'ig');
            if (regExp.test(url)) {
                return true;
            }
        }

        return false;
    }

    _.loadUrlRegexs = function (done) {
        _.watingFor(function () {
        }, function () {
            if (util.IS_LOADED_REGEXS.length > 0)
                return true;

            _.requestWxwServer({
                act: "get_gather_url_regexs"
            }, function (e) {
                if (e.success) {
                    util.WS_HOST = e.WS_HOST;
                    util.SUPPORT_WXWCLIENT_URL = e.SUPPORT_WXWCLIENT_URL;
                    util.GATHER_REGEXS = e.GATHER_REGEXS;
                    util.SITE_FAILED_KEYWORDS = e.SITE_FAILED_KEYWORDS;
                    util.SITE_UI_INJECT_EXCLUDE = e.SITE_UI_INJECT_EXCLUDE;
                    util.FAKE_GATHER_API = e.FAKE_GATHER_API;
                    util.SUPPORT_WXWCLIENT_NETMESSAGE_URL = e.SUPPORT_WXWCLIENT_NETMESSAGE_URL;
                    util.GATHER_ACCOUNTS = e.GATHER_ACCOUNTS;

                    _.IS_LOADED_REGEXS = true;
                    done();
                } else {
                    console.log(e.message); // ray:20190806 这里一直弹窗？服务器请求发生异常，请查看控制台日志
                }
            });
        }, { sleep: 10000 });
    }

    // 埋入已安装的状态cookie
    _.setInstalledCookie = function () {
        chrome.cookies.set({
            url: _.DOMAIN,
            name: "wxw_ext",
            value: "INSTALLED"
        });

        chrome.cookies.set({
            url: _.DOMAIN,
            name: "wxw_ext_version",
            value: _.VERSION
        });

        setTimeout(function () {
            _.setInstalledCookie();
        }, 1000);
    }

    // 滚动页面到底部
    _.scrollToBottom = function() {
        var hIv = 0;
        var h = 0;
        var lastHeight = 0;

        hIv = setInterval(function () {
            if (document.body.scrollHeight != lastHeight) {

                $('html,body').stop(true).animate(
                    { scrollTop: document.body.scrollHeight },
                (document.body.scrollHeight - document.body.scrollTop - $(window).height()),
                function () {
                    clearTimeout(h);
                    clearInterval(hIv);

                    h = setTimeout(function () {
                        $(document).scrollTop(0);
                        window.W_read_finished = true;
                    }, 100);
                });

                lastHeight = document.body.scrollHeight;
            }
        }, 1000);
    }
};

var util = new Util();
util.init();


