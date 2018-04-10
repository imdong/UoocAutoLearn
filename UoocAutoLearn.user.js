// ==UserScript==
// @name         优课在线自动看视频
// @namespace    http://www.qs5.org/?UoocAutoLearn
// @version      0.2
// @description  优课在线自动在线看视频工具
// @author       ImDong
// @match        *://*.uooconline.com/home
// @grant        none
// ==/UserScript==

(function (window) {

    // 定时检测元素出现
    (function (selector, callback) {
        if ($(selector).length > 0) {
            callback(selector);
        } else {
            setTimeout(() => {
                arguments.callee(selector, callback);
            }, 100);
        }
    })('.msg1', function (selector) {
        $(selector).bind('DOMNodeInserted', function (e) {
            // 追加按钮
            $('.course-item .course-right-bottom-btn').not('.uooc-auto-learn-btn').each(function (key, item) {
                var cid = item.pathname.split('/').pop(),
                    btnHtml = '<a class="course-right-bottom-btn uooc-auto-learn-btn" style="font-size: 12px; width: 60px;" data-cid="' + cid + '">在线挂机</a>';
                if (typeof item.dataset.btnAdd == "undefined" && cid != '%7B%7Bitem.id%7D%7D') {
                    item.dataset.btnAdd = 'isAdd'; // 追加元素
                    // 修改样式
                    item.style.fontSize = '12px';
                    item.style.width = '60px';
                    // 追加元素
                    $(item).before(btnHtml);
                }
            });
        });

        // 绑定按钮事件
        $('.msg1').on('click', '.uooc-auto-learn-btn', function () {
            UoocAutoLearn.cid = this.dataset.cid;

            console.log('开始任务', UoocAutoLearn.cid);

            // 获取课程进度
            UoocAutoLearn.getCourseLearn();
        })
    });

    // 创建对象
    var UoocAutoLearn = window.UoocAutoLearn || {
        apiUrl: '/home/learn/'
    };

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

                console.log(
                    '课程信息', UoocAutoLearn.parent_name,
                    '章节', UoocAutoLearn.chapter_id,
                    '部分', UoocAutoLearn.section_id,
                    '资源', UoocAutoLearn.resource_id,
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
                console.log('已看至', UoocAutoLearn.video_pos, '秒');
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

    window.UoocAutoLearn = UoocAutoLearn;
})(window);
