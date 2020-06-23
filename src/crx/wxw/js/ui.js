/*
author:Ray
date:2017-9-21
*/

var UI = function () {
    var _ = this;

    var host = location.host;
    var origin = location.origin;
    var isGatherBoxInline = false;
    var isGatherBtnSmall = false;
    var isUiChecked = false;

    _.init = function () {
        chrome.runtime.onMessage.addListener(
            function (message, sender, response) {
                if (message.act == "showloading") {
                    _.showLoading(message.text);
                } else if (message.act == "closeloading") {
                    _.closeLoading();
                } else if (message.act == "showmessage") {
                    _.showMessage(message.text, message.type);
                } else if (message.act == "gatherall") {
                    _.gatherAll(message.tabid);
                } else if (message.act == "gather_all_next") {
                    if (message.rndid == _.gatherAllID)
                        _.gatherNext();
                }
            });

        util.loadUrlRegexs(function () {
            _.wrapImageLinks();
        });

        return this;
    }

    _._MESSAGE_DELAY_CLOSE = null;
    _.gatherAllID = Math.random();
    // 采集该页面下的所有项目
    _.gatherAll = function (tabid) {
        var urls = [];
        _.tabid = tabid;

        $(".btn_wxwgather").each(function () {
            var img = $(this).find("img").attr("src");
            var url = $(this).attr("href");
            var protocol = location.protocol;

            if (!img) return;

            if (url.indexOf("http") != 0 &&
                url.indexOf("//") != 0) {
                if (url.indexOf("/") != 0)
                    url = origin + "/" + url;
                else
                    url = origin + url;
            }

            if (url.indexOf("//") == 0) {
                url = protocol + url;
            }

            if ($(this).attr("href")) {
                // 去除重复
                var found = false;
                for (var j = 0; j < urls.length; j++) {
                    if (urls[j].url == url) {
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    if(util.gatherUrlUseable(url, host)){
                        urls.push({
                            url: url,
                            image: img
                        });
                    }
                }
            }
        });

        _.gatherAllUrls = urls;
        _.showGatherAllDialog();
    }

    // 显示下载单页界面
    _.tabid = 0;
    _.stopGatherAll = false;
    _.gatherAllIndex = 0;
    _.gatherAllUrls = [];

    var _createGatherDialog = function(){
        var HTML =`
                    <div class="wxw_gather_dialog_wrapper">
                        <div class="wxw_gather_dialog">
                            <img src="https://www.wxwerp.com/images/logo.png"
                                    class="wxw_gather_dialog_logo" />
                            <div class="wxw_gather_dialog_btn wxw_gather_dialog_btn_stop">停止</div>
                            <div class="wxw_gather_dialog_tabs">
                                <div class="wxw_gather_dialog_tab wxw_gather_dialog_tab_chked">批量采集本页所有产品</div>
                            </div>
                            <div class="wxw_gather_dialog_process_wrapper">
                                    <div class="wxw_gather_dialog_process">
                                        <div class="wxw_gather_dialog_process_bar" style="width: 0%;"></div>
                                    </div>
                                    <div class="wxw_gather_dialog_description">
                                        <span>进度</span>
                                        <span style="margin-left: 10px; margin-right: 10px;"
                                                class="wxw_gather_dialog_process_process"></span>
                                        <span class="wxw_gather_dialog_process_percent"></span>
                                    </div>
                                </div>
                            <div class="wxw_gather_dialog_main">
                                <div class="wxw_gather_dialog_product_list">
                                </div>
                            </div>
                        </div>
                    </div>
                `;

        $("body").append(util.trim(HTML));

        $(".wxw_gather_dialog_btn_stop").on("click", function(){
            _.stopGatherAll = true;
            $(".wxw_gather_dialog_wrapper").hide();
        })

        return $(".wxw_gather_dialog_wrapper");
    }

    var _getSingleGatherDialog = util.getSingleton(_createGatherDialog);

    _.showGatherAllDialog = function(){
        if (_.gatherAllUrls.length == 0) {
            _.showMessage("不支持采集该页面，请<a href='" + util.DOMAIN + "/shared/help/asks.aspx' target=_blank style='color:white;display:inherit'>提交工单</a>。我们将为您提供对接。", "error");
            return;
        }

        var products = _.gatherAllUrls;
        var singleGatherDialog = _getSingleGatherDialog();

        var HTML = `
                ${products.map(product => `
                    <div class="wxw_gather_dialog_product">
                        <div class="wxw_gather_dialog_product_pic">
                            <img src="${product.image}" />
                        </div>
                        <div class="wxw_gather_dialog_product_state">
                            <span class="wxw_gather_dialog_product_state_success">已采集</span>
                            <span class="wxw_gather_dialog_product_state_pending">等待采集</span>
                        </div>
                    </div>
                `).join('')}
        `;

        singleGatherDialog.find(".wxw_gather_dialog_product_list").html(util.trim(HTML));
        singleGatherDialog.show();

        _.stopGatherAll = false;
        _.gatherAllIndex = 0;

        _.gatherNext();
    }

    _.gatherNext = function () {
        if (_.stopGatherAll || _.gatherAllUrls.length == 0) return;

        var url = _.gatherAllUrls[_.gatherAllIndex++];
        if (url == null) {
            $(".wxw_gather_dialog_process_bar").addClass("wxw_gather_dialog_process_bar_done");
            $(".wxw_gather_dialog_btn_stop").text("完成");
            return;
        }
         
        $(".wxw_gather_dialog_process_process").text(_.gatherAllIndex + "/" + _.gatherAllUrls.length);

        var percent = (_.gatherAllIndex / _.gatherAllUrls.length * 100).toFixed(2) + "%";
        $(".wxw_gather_dialog_process_percent").text(percent);
        $(".wxw_gather_dialog_process_bar").css("width", percent);
        $($(".wxw_gather_dialog_product")[_.gatherAllIndex -1]).addClass("wxw_gather_dialog_product_success");

        if (url.url && util.gatherUrlUseable(url.url, host)) {

            //回调之后
            chrome.runtime.sendMessage({
                act: "fetch_on_image",
                url: url.url,
                action_from: "gather_all",
                tabid: _.tabid,
                rndid: _.gatherAllID
            });
        } else {
            _.gatherNext();
        }
    }

    var _createMessage = function(text, type){
        var HTML =
        "<div class='wxw_message " + type + "'>" +
            "<img class='wxw_logo' src='https://www.wxwerp.com/images/wxw_logo_white.png' />" +
            "<span class='text'>" +
            text +
            "</span>" +
            "<a class='close' href='javascript:void(0)'>关闭</a>" +
        "</div>";

        $("body").append(HTML);
        
        var $messageBox = $("div.wxw_message");

        $messageBox.find("a.close").click(function () {
            $messageBox.hide();
        });

        return $messageBox;
    }

    var _getSingleMessage = util.getSingleton(_createMessage);

    _.showMessage = function(text, type){
        var singleMessage = _getSingleMessage(text, type);

        singleMessage
        .removeClass()
        .addClass("wxw_message")
        .addClass(type);

        singleMessage.find("text").html(text);

        singleMessage.show();

        clearTimeout(_._MESSAGE_DELAY_CLOSE);
        _._MESSAGE_DELAY_CLOSE = setTimeout(function(){
            singleMessage.hide();
        }, 15000)
    }

    var _createLoading = function(text){
        var HTML = [];
        HTML.push("<div class='wxw_gather_loading'>");
        HTML.push("<img class='logo' src='https://www.wxwerp.com/images/wxwlogo.png' />");
        HTML.push("<div class='text'>" + text + "<span class='loading_dot'></span></div>");
        HTML.push("<div class='loading_wxw'><span></span><span></span><span></span><span></span><span></span></div>");
        HTML.push("</div>");
        $("body").append(HTML.join(""));

        return $(".wxw_gather_loading");
    }

    var _getSingleLoading = util.getSingleton(_createLoading);
    var _singleLoading = null;

    _.showLoading = function(text){
        _singleLoading = _getSingleLoading(text);
        _singleLoading.find(".text").text(text);
        _singleLoading.show();
    }

    _.closeLoading = function () {
        _singleLoading.hide();
    }

    _.wrapImageLinks = function () {
        if (!util.gatherSiteUseable(host)) return;

        if (util.isUiInjectExclude(host)) return;

        $("a:not(.wxw_checked)").each(function () {
            var a = $(this);
            var href = a.attr("href");
            if (a.hasClass("wxw_checked"))
                return;

            a.addClass("wxw_checked");

            var url = href || "";

            if(url.indexOf("http") == -1 &&
                url.indexOf("//") == -1){
                if(url.indexOf("/") == 0)
                    url = origin + href;
                else
                    url = origin + "/" + href;
            }

            if (!util.gatherUrlUseable(url, host)) {
                return;
            }

            if (
                !href || href == "#" ||
                href.indexOf("javascript:") == 0) {
                return;
            }

            

            a.addClass("btn_wxwgather")

            var btn = a.append("<span class='wxw-link'>采到旺销王</span>").find(".wxw-link:last");
         
            //if (!isUiChecked) {
                isGatherBoxInline = getComputedStyle(this)["display"] === "inline";
                
                //isUiChecked = true;
            //}

            if (isGatherBoxInline) {
                a.addClass("wxw-d-block");
            }

            var height = a.height();

            //console.log(height);
            //console.log($(this).offsetHeight);

            isGatherBtnSmall = height < 100;


            if (isGatherBtnSmall) {
                btn.addClass("wxw-sm");
                
                if(btn.parents("a").find("img").length > 0)
                {
                    btn.parents("a").parent().css("overflow", "visible");
                }
            }

            btn.click(function (e) {
                e.stopPropagation();
                chrome.runtime.sendMessage({
                    act: "fetch_on_image",
                    url: href
                }, function (success) {
                    if (success) {
                        btn.addClass("clicked");
                        btn.text("已采集");
                    }
                });

                return false;
            });
        });

        // 由于页面可能动态加载，需要不断递归
        setTimeout(function () {
            _.wrapImageLinks();
        }, 1000);
    }
};

var ___ui = new UI().init();
