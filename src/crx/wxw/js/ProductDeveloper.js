// 产品开发爬虫
var ProductDeveloper = function () {
    var _ = this;
    _.waiting = 1000;
    _.result = [];

    _.init = function () {
    }

    // 开始
    _.startUrls = function (tabid, urls, progressCallback, callback) {
        _.result = [];

        _.startNext(tabid, urls, 0, progressCallback, function (e) {
            callback(_.result);
        });
    }

    // 执行下一个
    _.startNext = function (tabid, urls, i, progressCallback, callback) {
        _.convertHTMLToList(tabid, urls[i], function (e) {
            _.result.push({
                url: urls[i],
                list: e.list
            });

            progressCallback({
                index: i + 1,
                count: urls.length,
                percent: ((i + 1) / urls.length * 100).toFixed(2) + "%",
                list: e.list
            });

            if (urls[i + 1]) {
                _.startNext(tabid, urls, i + 1, progressCallback, callback);
            } else {
                callback();
            }
        });
    }

    // 采集页面相关内容并传到旺销王服务器
    _.convertHTMLToList = function (tabid, url, callback) {
        chrome.tabs.update(tabid, {
            url: url
        }, function () {
            setTimeout(function () {
                var pageLoaded = false;
                util.watingFor(function () {
                    //console.log("start 1.0");
                    chrome.tabs.executeScript(tabid, {
                        code: "(function(){util.scrollToBottom();})()",
                        runAt: "document_end"
                    }, function (resultsArray) {
                        //console.log("start 2.0");
                        clearInterval(_.h);
                        var startTime = new Date().getTime();

                        _.h = setInterval(function () {
                            chrome.tabs.executeScript(tabid, {
                                code: "(function(){return window.W_read_finished;})()",
                                runAt: "document_end"
                            }, function (resultsArray) {
                                //console.log("start 3.0");
                                if (
                                    new Date().getTime() - startTime > 20000 || // 20秒强制结束
                                    resultsArray && resultsArray[0]) {
                                    clearInterval(_.h);

                                    // 获取 HTML
                                    chrome.tabs.executeScript(tabid, {
                                        code: "(function(){return document.body.innerHTML;})()",
                                        runAt: "document_end"
                                    }, function (resultsArray) {
                                        var HTML = resultsArray[0];
                                        // console.log(HTML);
                                        util.requestWxwServer({
                                            act: "get_gahter_product_list_by_html",
                                            url: url,
                                            html: HTML
                                        }, function (e) {
                                            // console.log("start 5.0 " + JSON.stringify(e));
                                            callback(e);
                                        });
                                    });
                                }
                            });
                        }, _.waiting);
                    });
                }, function () {
                    //console.log("check 1.0")
                    try {
                        chrome.tabs.executeScript(tabid, {
                            code: "(function(){return document.body.innerHTML;})()",
                            runAt: "document_end"
                        }, function (resultsArray) {
                            pageLoaded = resultsArray != null && resultsArray.length > 0;
                        });
                    } catch (e) { }

                    return pageLoaded;
                });
            }, 1000);
        });
    }
}