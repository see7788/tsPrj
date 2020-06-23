$(function () {
    var storageUri = localStorage.getItem("Uri") || "";
    $("#pros_url").val(storageUri);

    $("#btnStart").click(function () {
        var maskedUrl = $("#pros_url").val();

        localStorage.setItem("Uri",maskedUrl);

        if (maskedUrl == "") {
            alert("请输入产品搜索页链接掩码");
            return;
        }

        $("#progress_cnt").removeClass("hidden");
        $(".page").text(1);
        $(".pages").text(1);
        $(".progress_ani").css("width", "100%");
        $('#pros_url').blur();
        $(".switch_tabs ul li[data-panel=log]").click();
        $("#pros_cnt .tip div").html("正在抓取中...");

        var delay = $("#delay").val();

        try {
            if (delay)
                delay = parseFloat(delay) * 1000;
            else
                delay = 1000;
        }
        catch (e) {
            delay = 1000;
        }

        StartUrl(maskedUrl, delay);
    });

    $(".switch_tabs ul").click(function (e) {
        var $tab = $(e.target);
        var panel = $tab.attr("data-panel");

        $(".switch_tabs li").removeClass("chked");
        $tab.addClass("chked");
        $(".panel").addClass("hidden");
        $("." + panel).removeClass("hidden");
    });

    $('#pros_url').blur(function () {
        var urls = GetUrls($("#pros_url").val());

        if (urls.length > 0) {
            $("#preview_link").empty();

            //链接生成预览
            for (var i = 0; i < urls.length; i++)
                $("#preview_link").append("<li>" + (i + 1) + ". " + urls[i] + "</li>");
        }
    });
});

function GetUrls(maskedUrl) {
    var urls = [];

    if (maskedUrl.indexOf("(") > -1 &&
        maskedUrl.indexOf(")") > -1) {
        var mask = maskedUrl.substring(maskedUrl.indexOf("(") + 1, maskedUrl.indexOf(")"));
        var range_mask = mask.split(',')[0];
        var step = parseInt(mask.split(',')[1]);
        var range = range_mask.split("-");
        var rangeStart = parseInt(range[0]);
        var rangeEnd = parseInt(range[1]);

        if (!step) step = 1;

        for (var i = rangeStart; i <= rangeEnd; i += step) {
            urls.push(maskedUrl.replace("(" + mask + ")", i));
        }
    } else {
        urls.push(maskedUrl);
    }

    return urls;
}

function StartUrl(maskedUrl, delay) {
    var urls = GetUrls(maskedUrl);

    chrome.tabs.create({
        url: "about:blank",
        active: false
    }, function (tab) {
        var productDev = new ProductDeveloper();
        productDev.waiting = delay;
        productDev.startUrls(tab.id,
            urls,
            function (e) {
                // 进行中 e.percent
                $(".page").text(e.index);
                $(".pages").text(e.count);
                $(".progress_ani").css("width", e.percent);

                var list = e.list;//抓取的产品数据

                if (!list || list.length == 0) {
                    // console.log("此次未爬取产品");

                    if ($("#pros_cnt tr.item").length == 0)
                        $("#pros_cnt .tip div").html("暂未爬取到任何记录");
                }
                else {
                    var html = [];

                    for (var i = 0; i < list.length; i++) {
                        var pic = list[i].pic;

                        if (pic && pic.indexOf("http") < 0)
                            pic = "http://" + pic;

                        html.push("<tr class='item'>");
                        html.push("  <td><div class='thumb'><img src='" + pic + "'></div></td>");
                        html.push("  <td><div class='name'><a class='link' target='_black' href='" + list[i].url + "'>" + list[i].name + "</a></div></td>");
                        html.push("  <td>USD $" + list[i].price + "</td>");
                        html.push("  <td>" + list[i].orders + "</td>");
                        html.push("  <td>" + list[i].favs + "</td>");
                        html.push("  <td>" + list[i].stars.toFixed(1) + "</td>");
                        html.push("</tr>");
                    }

                    $("#pros_cnt .tip").empty();
                    $("#pros_cnt").append(html.join(""));//添加到爬取列表
                    $(".pro_count").text($("#pros_cnt tr.item").length);
                }
            },
            function (e) {
                // 全部完毕
                $("#progress_cnt").addClass("hidden");
                chrome.tabs.remove(tab.id);
            });
    });
}