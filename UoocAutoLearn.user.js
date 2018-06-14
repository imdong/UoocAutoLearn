// ==UserScript==
// @name         优课在线自动看视频
// @namespace    http://www.qs5.org/?UoocAutoLearn
// @version      1.1.180614
// @description  优课在线自动在线看视频工具
// @author       ImDong
// @match        *://*.uooconline.com/home
// @match        *://*.uooconline.com/exam/*
// @match        *://www1.baidu.com/s?uooc=1&*
// @grant        none
// ==/UserScript==

(function (window) {

    // 创建对象
    var UoocAutoLearn = window.UoocAutoLearn || {
        apiUrl: '/home/learn/'
    };

    // 遍历添加按钮
    UoocAutoLearn.homeAddBtn = function () {
        console.log("homeAddBtn");
        $('.course-item .course-right-bottom-btn').not('.uooc-auto-learn-btn').each(function (key, item) {
            // 设置未修改过的
            if (typeof item.dataset.btnAdd == "undefined") {
                // 获取标记
                var cid = item.pathname.split('/').pop(),
                    btnHtml = '<a class="course-right-bottom-btn uooc-auto-learn-btn" style="font-size: 12px; width: 58px; margin-left: 4px;" data-cid="' + cid + '">在线挂机</a>';

                if (cid != '%7B%7Bitem.id%7D%7D') {
                    // 设置为已修改
                    item.dataset.btnAdd = 'isAdd';

                    // 修改样式
                    item.style.fontSize = '12px';
                    item.style.width = '58px';

                    // 追加元素
                    $(item).before(btnHtml);
                }
            }
        });
    };

    $(function () {
        // 绑定按钮事件
        $(document).on('click', '.uooc-auto-learn-btn', function () {
            UoocAutoLearn.cid = this.dataset.cid;

            console.log('开始任务', UoocAutoLearn.cid);

            // 结束定时添加按钮的定时器
            clearInterval(UoocAutoLearn.addBtnIntervalId);

            // 获取课程进度
            UoocAutoLearn.getCourseLearn();
        });
    });

    // 获取课程列表
    UoocAutoLearn.getCatalogList = function () {
        $.ajax({
            type: "GET",
            url: this.apiUrl + 'getCatalogList',
            data: {
                cid: this.cid
            },
            success: function (response) {
                UoocAutoLearn.loopCatalog(response.data);
            }
        });
    };

    //  遍历课程
    UoocAutoLearn.loopCatalog = function (data) {
        var isFinished = true;
        for (let index = 0; index < data.length; index++) {
            const item = data[index];
            if (item.finished == 0) {
                isFinished = false;
                if (typeof item.children != 'undefined') {
                    UoocAutoLearn.loopCatalog(item.children);
                } else {
                    // 播放这个课程
                    console.log('新的课程', item.number, item.name);

                    UoocAutoLearn.catalog_id = item.id;
                    UoocAutoLearn.chapter_id = item.pid;
                    UoocAutoLearn.video_pos = 0;

                    // 开始下一课程
                    UoocAutoLearn.getUnitLearn();
                }
                break;
            }
        }
        if (isFinished) {
            console.log('恭喜，本课已全看完。');
        }
    };

    // 获取课程进度
    UoocAutoLearn.getCourseLearn = function () {
        $.ajax({
            type: "GET",
            url: this.apiUrl + 'getCourseLearn',
            data: {
                cid: this.cid
            },
            success: function (response) {
                if (response.code != 1) {
                    console.log('Error', response);
                    return;
                }
                UoocAutoLearn.chapter_id = response.data.chapter_id;
                UoocAutoLearn.section_id = response.data.section_id;
                UoocAutoLearn.resource_id = response.data.resource_id;
                UoocAutoLearn.catalog_id = response.data.catalog_id;
                UoocAutoLearn.subsection_id = response.data.subsection_id;
                UoocAutoLearn.parent_name = response.data.parent_name;

                // 如果没有看过
                if (UoocAutoLearn.chapter_id <= 0) {
                    UoocAutoLearn.getCatalogList();
                    return;
                }

                console.log(
                    '课程信息', UoocAutoLearn.parent_name,
                    '章节', UoocAutoLearn.chapter_id,
                    '部分', UoocAutoLearn.section_id,
                    '资源', UoocAutoLearn.resource_id
                );

                // 获取课程观看时间
                UoocAutoLearn.getUnitLearn();
            }
        });
    };

    // 获取当前课程观看时间
    UoocAutoLearn.getUnitLearn = function () {
        $.ajax({
            type: "GET",
            url: this.apiUrl + 'getUnitLearn',
            data: {
                cid: this.cid,
                chapter_id: this.chapter_id,
                section_id: this.section_id,
                catalog_id: this.catalog_id
            },
            success: function (response) {
                // 遍历每一个视频
                var isFinished = true;
                for (let index = 0; index < response.data.length; index++) {
                    const item = response.data[index];
                    if (item.finished == 0) {
                        UoocAutoLearn.video_pos = parseFloat(item.video_pos);
                        UoocAutoLearn.videoSource = item.video_play_list[0].source;
                        UoocAutoLearn.title = item.title;
                        UoocAutoLearn.resource_id = item.id;
                        isFinished = false;

                        console.log('当前任务', UoocAutoLearn.parent_name, UoocAutoLearn.title);

                        // 获取视频时长
                        UoocAutoLearn.getVideoLength();

                        break;
                    }
                }
                // 如果都看完了
                if (isFinished) {
                    // 获取下一节课
                    UoocAutoLearn.getCatalogList();
                }
            }
        });
    };

    // 获取视频长度
    UoocAutoLearn.getVideoLength = function () {
        var video = document.createElement('video');
        // 加载完成后调用
        video.onloadeddata = function () {
            UoocAutoLearn.video_length = this.duration;

            console.log('总时长', UoocAutoLearn.video_length, '秒, 已看至', UoocAutoLearn.video_pos, '秒');

            // 开始刷新时间
            UoocAutoLearn.markVideoLearn();
        };
        video.src = UoocAutoLearn.videoSource;
        return;
    };

    // 刷新时间
    UoocAutoLearn.markVideoLearn = function () {
        this.video_pos = this.video_pos + 10;
        if (this.video_pos > this.video_length) this.video_pos = this.video_length;

        $.ajax({
            type: "POST",
            url: this.apiUrl + 'markVideoLearn',
            data: {
                chapter_id: this.chapter_id,
                cid: this.cid,
                // hidemsg_: true,
                network: 3,
                resource_id: this.resource_id,
                section_id: this.section_id,
                source: 1,
                subsection_id: this.subsection_id,
                video_length: this.video_length,
                video_pos: this.video_pos
            },
            success: function (response) {
                console.log('已看至', UoocAutoLearn.video_pos, '秒, 总', UoocAutoLearn.video_length, '秒');
                if (response.data.finished == 1 || UoocAutoLearn.video_pos >= UoocAutoLearn.video_length) {
                    console.log('本课已经结束');
                    // 获取下一节课
                    UoocAutoLearn.getCatalogList();
                    return;
                }
                setTimeout(() => {
                    UoocAutoLearn.markVideoLearn();
                }, 10 * 1000);
            }
        });
    };

    // 添加百度搜索按钮
    UoocAutoLearn.examAddBaidu = function () {
        // 修改页面样式
        $('body>div.uwidth').css({ marginLeft: '0px' });

        $('.ti-q-c').wrap('<a href="javascript:;" class="question-item"></a>');
        $('.question-item').click(function (e) {
            layer.open({
                type: 2,
                title: false,
                shadeClose: true, // 遮罩关闭
                shade: 0.5, // 遮罩透明度
                closeBtn: 0, //不显示关闭按钮
                offset: 'r', // 弹出层位置
                area: ['730px', '100%'], // 大小
                anim: 3, // 动画 向左滑动
                content: 'https://www1.baidu.com/s?uooc=1&wd=' + this.innerText
            });
        });
    };

    // 百度搜索页面修改
    UoocAutoLearn.baiduLink = function () {
        $('#content_left .result h3.t a').click(function (e) {
            window.parent.postMessage(this.href, document.referrer);
            return false;
        });
    };

    // 监听消息回调
    window.addEventListener('message', function (e) {
        // 页面宽度
        var w = document.body.clientWidth - 550;
        layer.open({
            type: 2,
            title: false,
            shadeClose: true, // 遮罩关闭
            shade: 0.5, // 遮罩透明度
            closeBtn: 0, //不显示关闭按钮
            offset: 'r', // 弹出层位置
            area: [w + 'px', '100%'], // 大小
            anim: 3, // 动画 向左滑动
            content: e.data
        });
    }, false);

    // 遍历添加按钮
    UoocAutoLearn.loopAddBtn = function () {
        console.log('loopAddBtn');

        // 判断页面地址
        if (/^\/exam\//.test(location.pathname)) {
            console.log("exam");
            // 判断题目是否出来
            if ($('.ti-q-c').length > 0) {
                UoocAutoLearn.examAddBaidu();
            } else {
                // 等1秒再检测
                setTimeout(() => {
                    UoocAutoLearn.loopAddBtn();
                }, 100);
            }
        } else if (/^\/home/.test(location.pathname)) {
            console.log("home");

            // 尝试添加按钮
            UoocAutoLearn.homeAddBtn();

            // 死循环每隔500检测一次按钮
            UoocAutoLearn.addBtnIntervalId = setInterval(() => {
                UoocAutoLearn.homeAddBtn();
            }, 500);
        } else if (/^\/s/.test(location.pathname) && /^\?uooc=1&/.test(location.search) && /^https?:\/\/.*?\.uooconline\.com\/exam\//.test(document.referrer)) {
            console.log('载入百度');
            UoocAutoLearn.baiduLink();
        }
    };

    // 注册到全局
    window.UoocAutoLearn = UoocAutoLearn;

    // 添加按钮
    UoocAutoLearn.loopAddBtn();
})(window);
