
// 客户端网页工具
var browserClient = new function () {
    var _ = this;

    // 登录网站
    _.login = function (muid, url, status_url, logined_html_contains, callback) {
        wxwclient.CheckClient(muid, function () {
            wxwclient.Post({
                act: "loginsite",
                url: url,
                status_url: status_url,
                logined_html_contains: logined_html_contains
            }, function (e) {
                if (callback) callback(e);
            });
        });
    }

    // 获取 cookie
    _.getCookie = function (url, callback) {
        var html = "";

        wxwclient.Post({
            act: "get_site_cookie",
            url: url
        }, callback);
    }

    // 获取 cookie
    _.isLogined = function (url, encoding, callback) {
        wxwclient.Post({
            act: "is_logined_site",
            url: url,
            encoding: encoding
        }, callback);
    }

    // 获取 cookie
    _.execJs = function (url, js, callback) {
        var html = "";

        wxwclient.Post({
            act: "exec_js",
            url: url,
            js: js
        }, callback);
    }

    // 采集页面
    _.post = function (url, post, encoding, callback) {
        var html = "";

        wxwclient.Post({
            act: "post",
            url: url,
            post: post,
            encoding: encoding
        }, function (e) {
            if (e.success) {
                callback(e.html);
            } else {
                callback("");
            }
        });
    }
}