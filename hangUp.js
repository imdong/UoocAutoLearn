(function (window) {

    window.addEventListener("load", function (event) {

        $('#center_index').bind('DOMNodeInserted', function (e) {
            // 追加按钮
            $('.course-item .course-right-bottom-btn').each(function (key, item) {
                var cid = item.pathname.split('/').pop(),
                    btnHtml = '<a class="course-right-bottom-btn hang-up" style="font-size: 12px; width: 60px;" data-cid="' + cid + '">在线挂机</a>';
                // 修改样式
                item.style.fontSize = '12px';
                item.style.width = '60px';
                // 追加元素
                $(item).before(btnHtml);
            });
        });

        // $('.msg1').bind('DOMNodeInserted', function (e) {
        //     var courseList = this.getElementsByClassName('course-item');
        //     for (var index = 0; index < courseList.length; index++) {
        //         var item = courseList[index];

        //         var domBtn = item.getElementsByClassName('course-right-bottom-btn')[0],
        //             cid = domBtn.pathname.split('/').pop(),
        //             btnHtml = '<a class="course-right-bottom-btn hang-up" style="font-size: 12px; width: 60px;" data-cid="' + cid + '">在线挂机</a>';

        //         if (typeof domBtn.dataset.btnAdd == "undefined") {
        //             // 修改样式
        //             domBtn.style.fontSize = '12px';
        //             domBtn.style.width = '60px';
        //             domBtn.dataset.btnAdd = 'is'; // 追加元素

        //             $(item).before(btnHtml);
        //         }
        //     }
        // });
    });


    $(function () {
        console.log()
        $('#center_index').bind('DOMNodeInserted', function (e) {
            console.log('x');
        });
    });

    $('#center_index').bind('DOMNodeInserted', function (e) {
        console.log('x');
    });








    for (var index = 0; index < courseList.length; index++) {
        var item = courseList[index];




    }






    // 追加按钮
    $('.course-item .course-right-bottom-btn').each(function (key, item) {
        var cid = item.pathname.split('/').pop(),
            btnHtml = '<a class="course-right-bottom-btn hang-up" style="font-size: 12px; width: 60px;" data-cid="' + cid + '">在线挂机</a>';
        // 修改样式
        item.style.fontSize = '12px';
        item.style.width = '60px';
        // 追加元素
        $(item).before(btnHtml);
    });

        // 绑定按钮事件
    $('.hang-up').click(function () {
        console.log('开始任务');
        hangUp.cid = this.dataset.cid;
        hangUp.getCourseLearn();
    });

    // 创建对象
    var hangUp = window.hangUp || {
        apiUrl: '/home/learn/'
    };

    // 获取课程列表
    hangUp.getCatalogList = function () {
        $.ajax({
            type: "GET",
            url: this.apiUrl + 'getCatalogList',
            data: {
                cid: this.cid
            },
            success: function (response) {
                hangUp.loopCatalog(response.data);
            }
        });
    }

    //  遍历课程
    hangUp.loopCatalog = function(data) {
        for (let index = 0; index < data.length; index++) {
            const item = data[index];
            if (item.finished == 0) {
                if (typeof item.children != 'undefined') {
                    hangUp.loopCatalog(item.children)
                } else {
                    // 播放这个课程
                    console.log('新的课程', item.number, item.name);
                    hangUp.catalog_id = item.id;
                    hangUp.chapter_id = item.pid;
                    hangUp.video_pos = 0;

                    // 开始下一课程
                    hangUp.getUnitLearn();
                }
                break;
            }
        }
    }

    // 获取课程进度
    hangUp.getCourseLearn = function () {
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
                hangUp.chapter_id = response.data.chapter_id;
                hangUp.section_id = response.data.section_id;
                hangUp.catalog_id = response.data.catalog_id;
                hangUp.resource_id = response.data.resource_id;
                hangUp.subsection_id = response.data.subsection_id;
                hangUp.parent_name = response.data.parent_name;

                // 获取课程观看时间
                hangUp.getUnitLearn();
            }
        });
    }

    // 获取当前课程观看时间
    hangUp.getUnitLearn = function () {
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
                for (let index = 0; index < response.data.length; index++) {
                    const item = response.data[index];
                    if (item.finished == 0) {
                        hangUp.video_pos = parseFloat(item.video_pos);
                        hangUp.videoSource = item.video_play_list[0].source;
                        hangUp.title = item.title;
                        hangUp.resource_id = item.id;
                        console.log('当前任务', hangUp.parent_name, hangUp.title);
                        // 获取视频时长
                        hangUp.getVideoLength(hangUp);

                        break;
                    }
                }
            }
        });
    }

    // 获取视频长度
    hangUp.getVideoLength = function (that) {
        var video = document.createElement('video');
        // 加载完成后调用
        video.onloadeddata = function () {
            that.video_length = this.duration;

            console.log('总时长', hangUp.video_length, '秒, 已看至', hangUp.video_pos, '秒');

            // 开始刷新时间
            that.markVideoLearn();
        }
        video.src = that.videoSource;
        return;
    }

    // 刷新时间
    hangUp.markVideoLearn = function () {
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
                console.log('已看至', hangUp.video_pos);
                if (response.data.finished == 1 || hangUp.video_pos >= hangUp.video_length) {
                    console.log('本课已经结束');
                    // 获取下一节课
                    hangUp.getCatalogList();
                    return;
                }
                setTimeout(() => {
                    hangUp.markVideoLearn();
                }, 10 * 1000);
            }
        });
    }

    window.hangUp = hangUp;
})(window);
