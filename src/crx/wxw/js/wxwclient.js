function WxwClient() {
    var _ = this;
    _.ws = null;
    _.connected = false;
    _.recv_msgs = {};

    _.connect = function (done) {
        //console.log("111");

        if (_.ws == null) {
            _.ws = new WebSocket("ws://127.0.0.1:18800/client");

            _.ws.onopen = function (event) {
                _.recv_msgs = {};
                _.connected = true;

                if (done) done();

                console.log("WebSocket Opened");
            };

            _.ws.onclose = function (e) {
                //console.log("WebSocket Closed");
                _.connected = false;
                _.ws = null;

                setTimeout(function () {
                    // 不断尝试重新链接
                    _.connect(done);
                }, 1000);
            };

            _.ws.onmessage = function (e) {
                var msg = JSON.parse(e.data);
                _.recv_msgs[msg._msgid] = msg;
                _.recv_msgs[msg._msgid]._finished = true;
            };
        } else {
            if (done)
                done();
        }
    }

    _.Post = function (data, done) {
        _.connect(function () {
            var _msgid = Math.ceil(Math.random() * 100000000);
            _.recv_msgs[_msgid] = { _finished: false };
            data._msgid = _msgid;

            util.watingFor(function () {
                if (_.recv_msgs[_msgid] &&
                    _.recv_msgs[_msgid]._finished) {
                    var msg = _.recv_msgs[_msgid];
                    _.recv_msgs[_msgid] = null;

                    done(msg);
                } else {
                    done({ success: false, message: "无法连接到客户端", data: data });
                }
            }, function () {
                return _.recv_msgs[_msgid] == null || !_.connected || _.recv_msgs[_msgid]._finished;
            });

            if (_.connected)
                _.ws.send(JSON.stringify(data));
        });
    }

    //_.CheckClient = function (muid, done) {
    //    _.connect();

    //    util.process(
    //        '正在检测<a class=link href="/client-download.html" target=_blank>客户端软件</a>是否启动..',
    //        function (processdone) {
    //            setTimeout(function () {
    //                processdone();

    //                if (!_.connected) {
    //                    util.ask("未检测到旺销王客户端，是否重试？ <a class='link' href='/client-download.html' target='_blank'>下载旺销王客户端</a>", function () {
    //                        _.CheckClient(muid, done);
    //                    }, function () {
    //                    });
    //                } else {
    //                    done();
    //                }
    //            }, 200);
    //        });
    //}
}

var wxwclient = new WxwClient();
