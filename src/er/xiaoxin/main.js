const _ = require('lodash')
//const axios = require('axios') 
window.DATAS = {
    db: require('electron').remote.getGlobal('istate').db
};
require('electron').remote.getGlobal('istate').db
console.log(window.DATAS.db)
//ipcRenderer.send("msg", data);
window.onload = function () {
    //判断网页链接是哪个页面
    DATAS.judgeUrl = function () {
        var url = location.href;
        //淘宝搜索页
        if (url.indexOf("s.taobao.com") != -1)
            return 1;
        //天猫搜索页
        if (url.indexOf("list.tmall.com") != -1)
            return 2;
        //淘宝店铺搜索页
        if (url.indexOf("taobao.com/search.htm") != -1)
            return 3;
        //天猫店铺搜索页
        if (url.indexOf("tmall.com/?q") != -1)
            return 4;
        //淘宝详情页
        if (url.indexOf("item.taobao.com") != -1)
            return 5;
        //天猫详情页
        if (url.indexOf("detail.tmall.com") != -1)
            return 6;
        //敦煌搜索页
        if (url.indexOf("dhgate.com/w") != -1)
            return 7;
        return 0;
    }

    //获取页面变量
    DATAS.getPageVar = function (str) {
        var script = document.createElement("script");
        script.setAttribute("id", "_script_");
        script.innerHTML = `
		var json = "";
		var data = eval("${str}");
		if (data instanceof Object)
			json = JSON.stringify(data);
		else json = data;
		_script_.setAttribute("json", json);
	`;
        document.body.appendChild(script);
        var data = script.getAttribute("json");
        document.body.removeChild(script);
        return data;
    }

    //生成底部按钮（采集数据）并自动添加到页面
    DATAS.createBtn = function (info) {
        var btnBox = document.querySelector("#_btnBox_");
        if (!btnBox) {
            var btnBox = document.createElement("div");
            btnBox.setAttribute("id", "_btnBox_");
            document.body.appendChild(btnBox);
        }
        var btn = document.createElement("button");
        btn.innerHTML = info;
        btnBox.appendChild(btn);
        return btn;
    }

    //向盒子里追加数据（localStorage.getItem("DATA")）
    DATAS.appendData = function (obj) {
        var lObj = {};
        if (localStorage.getItem("DATA"))
            lObj = JSON.parse(localStorage.getItem("DATA"));
        for (var key in obj)
            lObj[key] = obj[key];
        localStorage.setItem("DATA", JSON.stringify(lObj));
    }

    //从盒子里读取数据显示到页面元素上
    DATAS.getDatas = function (elem) {
        if (localStorage.getItem("DATA")) {
            var datas = JSON.parse(localStorage.getItem("DATA"));
            if (!elem) return datas;
            elem.innerHTML = "";
            for (var key in datas) {
                if (datas[key].isDel == true)
                    continue;
                var data = datas[key];
                var title = data["title"];
                var pic = data["pic"];
                var price = data["price"];
                elem.innerHTML += `
			<div class="cart-item" id="${key}">
				<div class="img-wrap">
					<img src="${pic}" />
				</div>
				<span>${title}</span>
				<div class="cart-item-border"></div>
				<strong>￥${price}</strong>
				<div class="delete-item"></div>
			</div>
			`;
            }
            elem.innerHTML += `<div class="button">全部提交</div>`;
            var dels = elem.querySelectorAll(".delete-item");
            for (var i = 0; i < dels.length; i++) {
                dels[i].onclick = function () {
                    var parent = this.parentElement.parentElement;
                    var window = this.parentElement;
                    datas[window.getAttribute("id")].isDel = true;
                    localStorage.setItem("DATA", JSON.stringify(datas));
                    parent.removeChild(window);
                    DATAS.updateBtnsColor();
                }
            }
        } else {
            if (!elem) return [];
            elem.innerHTML = "数据为空！";
        }
        /*
            <div class="cart-item">
                <div class="img-wrap">
                    <img src="" />
                </div>
                <span>非常好看的衣服</span>
                <div class="cart-item-border"></div>
                <strong>￥100</strong>
                <div class="delete-item"></div>
            </div>
        */
    }

    //同步按钮是否时灰色
    DATAS.updateBtnsColor = function () {
        var btns = document.querySelectorAll("._btn_");
        var datas = DATAS.getDatas();
        for (var i = 0; i < btns.length; i++) {
            var id = btns[i].getAttribute("id");
            if (datas.hasOwnProperty(id)) {
                if (datas[id].isDel == false)
                    DATAS.setBtnGray(btns[i]);
                else DATAS.delBtnGray(btns[i]);
            }
        }
    }

    //按钮变灰，传入按钮元素对象
    DATAS.setBtnGray = function (elem) {
        if (elem.className.indexOf("_disable_") == -1)
            elem.className += " _disable_";
    }
    //按钮恢复，传入按钮元素对象
    DATAS.delBtnGray = function (elem) {
        if (elem.className.indexOf("_disable_") != -1)
            elem.className = elem.className.replace(" _disable_", "");
    }

    //采集列表的规则和其他程序的操作
    /*
        rules的参数的格式
        {
            父元素 选择器(self::abc表示父元素的abc属性) 回调函数
            id:[parentElem, "a[data-nid]", function(elem) {
                return XXX;
            }]
        }
    */
    DATAS.getObjByListRules = function (rules) {
        var tmp = {};
        var id = "null";
        for (var key in rules) {
            var res = null;
            var parentElem = rules[key][0];
            var selector = rules[key][1];
            var fn = rules[key][2];
            if (selector.indexOf("self::") === 0)
                res = parentElem.getAttribute(selector.replace("self::", ""));
            else res = parentElem.querySelector(selector);
            res = fn(res);
            if (key == "id") {
                id = res;
                continue;
            }
            tmp[key] = res;
        }
        var obj = {};
        tmp["isDel"] = false;
        obj[id] = tmp;
        return obj;
    }

    //采集页面（详情页）的规则和其他程序
    /*
        rules的参数的格式
        {
            选择器 回调函数
            id:["#abc .def", function(elem) {
                return xxx;
            }]	
        }
    */
    DATAS.getObjByPageRules = function (rules) {
        var id = "null";
        var tmp = {};
        for (var key in rules) {
            var res = null;
            var selector = rules[key][0];
            var fn = rules[key][1];
            if (selector.indexOf("self::") === 0)
                res = document.getAttribute(selector.replace("self::", ""));
            else res = document.querySelector(selector);
            res = fn(res);
            if (key == "id") {
                id = res;
                continue;
            }
            tmp[key] = res;
        }
        var obj = {};
        obj[id] = tmp;
        return obj;
    }

    //为每个宝贝设置获取数据按钮
    //传入的参数是获取宝贝父元素的选择器
    DATAS.setBtnForGoods = function (parentRule, rules) {
        //每个宝贝都可以获取数据
        //var observer = new MutationObserver(callBack);
        //observer.observe(document.body, {
        //	"childList": true
        //});
        function callBack() {
            var items = document.querySelectorAll(parentRule);
            for (var i = 0; i < items.length; i++) {
                if (items[i].querySelector("._btn_"))
                    continue;
                if (items[i].className.indexOf("_win_") == -1)
                    items[i].className += " _win_";
                var btn = document.createElement("button");
                btn.className = "_btn_";
                var elem = items[i];
                var id = rules["id"][2](
                    elem.querySelector(rules["id"][1])
                );
                btn.setAttribute("id", id);
                btn.onclick = function () {
                    for (var key in rules)
                        rules[key][0] = this.parentElement;
                    var obj = DATAS.getObjByListRules(rules);
                    DATAS.appendData(obj);
                    DATAS.setBtnGray(this);
                    var box = document.querySelector("#_datasBox_");
                    if (box) DATAS.getDatas(box);
                };
                items[i].insertBefore(btn, items[i].firstElementChild);
            }
        }
        callBack();
    }

    //取列表有销量的按钮生成并添加页面
    //参数1 每个商品共有的父元素
    //参数2 DATAS.getObjByListRules所需要的参数
    DATAS.getListHasSales = function (parentRule, rules) {
        var btn = DATAS.createBtn("取有销量的");
        btn.onclick = function () {
            var items = document.querySelectorAll(parentRule);
            for (var i = 0; i < items.length; i++) {
                var elem = items[i];
                for (var key in rules)
                    rules[key][0] = elem;
                var obj = DATAS.getObjByListRules(rules);
                var isPass = true;
                for (var key in obj)
                    if (obj[key].volume == 0) {
                        isPass = false;
                        break;
                    }
                if (!isPass) continue;
                var _btn_ = items[i].querySelector("._btn_");
                //DATAS.setBtnGray(_btn_);
                DATAS.appendData(obj);
            }
            DATAS.updateBtnsColor();
            var datasbox = document.querySelector("#_datasBox_");
            if (datasbox) DATAS.getDatas(datasbox);
        }
    }

    //取列表排名前十的按钮生成并添加页面
    //参数1 每个商品共有的父元素
    //参数2 DATAS.getObjByListRules所需要的参数
    DATAS.getListTopTen = function (parentRule, rules) {
        var btn = DATAS.createBtn("取排名前十");
        btn.onclick = function () {
            var items = document.querySelectorAll(parentRule);
            for (var i = 0; i < 10; i++) {
                var elem = items[i];
                for (var key in rules)
                    rules[key][0] = elem;
                var obj = DATAS.getObjByListRules(rules);
                var _btn_ = items[i].querySelector("._btn_");
                //DATAS.setBtnGray(_btn_);
                DATAS.appendData(obj);
            }
            DATAS.updateBtnsColor();
            var datasbox = document.querySelector("#_datasBox_");
            if (datasbox) DATAS.getDatas(datasbox);
        }
    }

    //采集页面的按钮并添加页面
    DATAS.getDatasByPage = function (rules) {
        var btn = DATAS.createBtn("获取数据");
        btn.onclick = function () {
            var obj = DATAS.getObjByPageRules(rules);
            DATAS.appendData(obj);
        }
    }
















































    //根据各个不同网页获取不同的数据
    var urlType = DATAS.judgeUrl();

    //如果是淘宝搜索页
    if (urlType == 1) {
        var selector = "#mainsrp-itemlist .item";
        var rules = {
            id: [null, "a[data-nid]", function (id) {
                return "tb_" + id.getAttribute("data-nid");
            }],
            _id: [null, "a[data-nid]", function (id) {
                return id.getAttribute("data-nid");
            }],
            url: [null, ".pic a[href]", function (url) {
                return url.getAttribute("href");
            }],
            title: [null, ".row.title a", function (title) {
                title = title.innerHTML;
                title = title.replace(/\s|<\/?.*?>/g, "");
                return title;
            }],
            price: [null, ".price strong", function (price) {
                price = price.innerHTML;
                price = Number(price);
                return price;
            }],
            pic: [null, ".pic img", function (pic) {
                return pic.getAttribute("data-src");
            }],
            volume: [null, ".row .deal-cnt", function (volume) {
                volume = volume.innerHTML;
                volume = volume.replace(/\+?人付款/, "");
                volume = volume.replace("万", "*10000");
                volume = eval(volume);
                volume = parseInt(volume);
                return volume;
            }]
        };
        //每个商品都设置按钮获取数据（主要的）
        DATAS.setBtnForGoods(selector, rules);
        //获取有销量的按钮及功能
        DATAS.getListHasSales(selector, rules);
        //取排名前十按钮及功能
        DATAS.getListTopTen(selector, rules);
        //同步按钮的颜色
        DATAS.updateBtnsColor();
    }

    //如果是敦煌网搜索页
    if (urlType == 7) {
        //采集主体商品
        var selector = "#proGallery .gitem";
        var rules = {
            id: [null, "a[itemcode]", function (id) {
                return "dh_" + id.getAttribute("itemcode");
            }],
            _id: [null, "a[itemcode]", function (id) {
                return id.getAttribute("itemcode");
            }],
            url: [null, "a.subject", function (url) {
                return url.getAttribute("href");
            }],
            title: [null, "a.subject", function (title) {
                title = title.innerHTML;
                //title = title.replace(/\s|<\/?.*?>/g, "");
                return title;
            }],
            price: [null, ".price span", function (price) {
                price = price.innerHTML;
                return price;
            }],
            pic: [null, "img", function (pic) {
                return pic.getAttribute("src");
            }],
            volume: [null, ".ordernum", function (volume) {
                if (!volume) return 0;
                volume = volume.innerHTML;
                return volume;
            }]
        };
        //每个商品都设置按钮获取数据（主要的）
        DATAS.setBtnForGoods(selector, rules);
        //获取有销量的按钮及功能
        DATAS.getListHasSales(selector, rules);
        //取排名前十按钮及功能
        DATAS.getListTopTen(selector, rules);

        //采集左侧广告
        var selector = "#colLeft .b-recommendcon li";
        var rules = {
            id: [null, "a[itemcode]", function (id) {
                return "dh_" + id.getAttribute("itemcode");
            }],
            _id: [null, "a[itemcode]", function (id) {
                return id.getAttribute("itemcode");
            }],
            url: [null, ".b-recommendimg a", function (url) {
                return url.getAttribute("href");
            }],
            title: [null, ".b-recommendimg a", function (title) {
                return title.getAttribute("title");
            }],
            price: [null, ".price span", function (price) {
                price = price.innerHTML;
                return price;
            }],
            pic: [null, ".b-recommendimg img", function (pic) {
                return pic.getAttribute("src");
            }]
        };
        //每个商品都设置按钮获取数据（主要的）
        DATAS.setBtnForGoods(selector, rules);

        //同步按钮的颜色
        DATAS.updateBtnsColor();

        //全部采集左侧广告按钮
        var btn = DATAS.createBtn("采集左侧广告");
        btn.onclick = function () {
            var btns = document.querySelectorAll("#colLeft .b-recommendcon li ._btn_");
            for (var i = 0; i < btns.length; i++)
                btns[i].click();
        }
    }

    /* //如果是淘宝店铺搜索页
    if (urlType == 3) {
        var selector = ".shop-hesper-bd .item3line1 .item";
        var rules = {
            id:[null, "self::data-id", function(id) {
                return id;
            }],
            title:[null, ".detail a", function(title) {
                title = title.innerHTML;
                title = title.replace(/\s|<\/?.*?>/g, "");
                return title;
            }],
            price:[null, ".cprice-area .c-price", function(price) {
                price = price.innerHTML;
                price = Number(price);
                return price;
            }],
            pic:[null, ".photo img", function(pic) {
                return pic.getAttribute("src");
            }],
            volume:[null, ".sale-area .sale-num", function(volume) {
                volume = volume.innerHTML;
                volume = parseInt(volume);
                return volume;
            }]
        };
        //每个商品都设置按钮获取数据
        DATAS.setBtnForGoods(selector, rules);
        //获取有销量的按钮及功能
        DATAS.getListHasSales(selector, rules);
        //取排名前十按钮及功能
        DATAS.getListTopTen(selector, rules);
    }
    
    //如果是天猫搜索页
    if (urlType == 2) {
        var selector = "#J_ItemList .product";
        var rules = {
            id:[null, "self::data-id", function(id) {
                return id;
            }],
            title:[null, ".productTitle a", function(title) {
                title = title.innerHTML;
                title = title.replace(/\s|<\/?.*?>/g, "");
                return title;
            }],
            price:[null, ".productPrice em[title]", function(price) {
                price = price.getAttribute("title");
                price = Number(price);
                return price;
            }],
            pic:[null, ".productImg-wrap img", function(pic) {
                return pic.getAttribute("src");
            }],
            volume:[null, ".productStatus span:first-of-type em", function(volume) {
                volume = volume.innerHTML;
                volume = volume.replace(/\+?笔/, "");
                volume = volume.replace("万", "*10000");
                volume = eval(volume);
                volume = parseInt(volume);
                return volume;
            }]
        };
        //每个商品都设置按钮获取数据
        DATAS.setBtnForGoods(selector, rules);
        //获取有销量的按钮及功能
        DATAS.getListHasSales(selector, rules);
        //取排名前十按钮及功能
        DATAS.getListTopTen(selector, rules);
    }
    
    //如果是淘宝详情页
    if (urlType == 5) {
        DATAS.getDatasByPage({
            id:["null", function() {
                return DATAS.getPageVar("g_config.itemId");
            }],
            title:["null", function() {
                return DATAS.getPageVar("g_config.idata.item.title");
            }],
            pic:["null", function() {
                return DATAS.getPageVar("g_config.idata.item.auctionImages");
            }],
            price:["#J_PromoPriceNum", function(price) {
                return price.innerHTML;
            }],
            recommend:["#J_DivItemDesc", function(recommend) {
                return recommend.innerHTML;
            }]
        });
    } */




    var btn = DATAS.createBtn("查看数据");
    btn.onclick = function () {
        var box = document.querySelector("#_datasBox_");
        if (!box) {
            box = document.createElement("div");
            box.setAttribute("id", "_datasBox_");
            document.body.appendChild(box);
        }
        DATAS.getDatas(box);
        if (box.getAttribute("open") == "true") {
            box.setAttribute("open", "false");
        } else box.setAttribute("open", "true");
    }







}