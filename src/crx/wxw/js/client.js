/*
author:Ray
date:2017-9-20
*/
var Client = function () {
    var _ = this;

    _.ws = null;
    _.guid = Math.round(Math.random() * 1000000000);
    _.clientid = null;
    _.startRun = "2017-9-21 10:10:10";

    _.Events = {
        Message: function (command, params) { }
    }

    _.isConnected = function () {
        //return false;
        return _.ws != null && BG.client.ws.readyState == 1;
    }

    _.connect = function (done) {
        if (util.WS_HOST == null ||
            util.WS_HOST == "") {

            clearTimeout(_.h_connect);
            _.h_connect = setTimeout(function () {
                // 不断尝试重新链接
                _.connect(done);
            }, 1000);

            //console.log("未初始化主机无法链接");
            return;
        }

        console.log("正在连接 " + util.WS_HOST + "...");

        try {
            //ws://localhost:11688:30002/chrome/extmsg
            var url = "ws://" + util.WS_HOST + "/chrome/extmsg";

           alert("正在连接 " + url + "");

            _.ws = new WebSocket(url);
        } catch (e) {
            console.log(e.message + " 连接 " + util.WS_HOST + " 失败");

            clearTimeout(_.h_connect);
            _.h_connect = setTimeout(function () {
                // 不断尝试重新链接
                _.connect(done);
            }, 1000);
            return;
        }

        // 连接成功
        _.ws.onopen = function () {
            console.log(_.clientid + " 连接 " + util.WS_HOST + " 成功");

            _.request("login", { clientid: _.clientid });
        };

        _.ws.onmessage = function (e) {
            //console.log("onmessage:" + e.data);

            var msg = JSON.parse(e.data);
            _.Events.Message(msg.command, msg);
        };

        if (done)
            done();
    }
    
    _.init = function (clientid) {
        // 设置客户端ID
        _.setClientId(clientid);

        // 开始心跳
        _.connect(function () {
            // 状态验证
            _.connectStatusVerify();
        });
    }

    // 连接状态验证
    _.connectStatusVerify = function () {
        var CLOSED = 3;

        try {
            // 查看连接状态
            if (_.ws == null || _.ws.readyState == CLOSED) {
                _.connect(_.connectStatusVerify);
            }
        } catch (e) {
            //console.log("重新连接:" + e.message);
        }

        setTimeout(function () {
            _.connectStatusVerify();
        }, 1000);
    }

    _.setClientId = function (clientid) {
        var newId = clientid + "_" + _.guid;

        if (newId != _.clientid) {
            _.clientid = clientid + "_" + _.guid;

            chrome.cookies.set({
                url: util.DOMAIN,
                name: "wxw_ext_client_id",
                value: _.clientid
            });

            // 重新登录
            _.request("login", { clientid: _.clientid });
        }
    }

    _.request = function (command, params, done, error) {
        params.version = util.VERSION;

        var data = {
            Command: command,
            clientid: _.clientid,
            params: JSON.stringify(params)
        };

        if (_.ws) {
            _.ws.send(JSON.stringify(data));
        }
    }
}