module.exports.getPostList = function (jsdom_concurrency, callback) {
    var async = require('async'),
        jquery = require('../util/jsdom-jquery')();
    async.waterfall([
        function (cb) {
            var jsdom = require('jsdom');
            jsdom.env({
                url: 'http://www.taz.de',
                src: [jquery],
                done: cb
            });
        },
        function (window, cb) {
            var $ = window.$,
                posts = [];
            async.each($("#pages ul.news li.article"), function (article, next) {
                if ($(article).find('h4').length > 0) {
                    var post = {
                        url: $(article).find('a')[0].href,
                        titles: [
                            $(article).find('h4:first').text().trim(),
                            $(article).find('h3:first').text().trim()
                        ],
                        body: null,
                        threadUrl: null,
                        source: 'taz'
                    };
                    posts.push(post);
                };
                next();
            }, function (err) {
                window.close();
                cb(err, posts);
            });
        },
        function (posts, cb) {
            async.eachLimit(posts, jsdom_concurrency, function (post, next) {
                var jsdom = require('jsdom');
                jsdom.env({
                    url: post.url,
                    src: [jquery],
                    done: function (err, window) {
                        if (err) {
                            return next(err);
                        }
                        var $ = window.$;
                        var paragraphs = $('.sect_article p.article').text();
                        var postIndex = posts.indexOf(post);
                        posts[postIndex].body = paragraphs.replace(/<!--(?:.|\n)*?-->/gm, '');
                        if ($('.community .sect_commentlinks').length > 0) {
                            posts[postIndex].threadUrl = post.url;
                        }
                        window.close();
                        next();
                    }
                });
            }, function (err) {
                cb(err, posts);
            });
        },
        function (posts, cb) {
            var filteredPosts = [];
            async.each(posts, function (post, next) {
                if (typeof post.threadUrl === 'string') {
                    filteredPosts.push(post);
                }
                next();
            }, function (err) {
                cb(err, filteredPosts);
            });
        }
    ], function (err, posts) {
        callback(err, posts);
    });
};

module.exports.getCommentList = function (threadUrl, jsdom_concurrency, callback) {
    var async = require('async'),
        jquery = require('../util/jsdom-jquery')();
    async.waterfall([
        function (cb) {
            var jsdom = require('jsdom');
            jsdom.env({
                url: threadUrl,
                src: [jquery],
                done: cb
            });
        },
        function (window, cb) {
            var comments = [];
            var $ = window.$;
            async.each($('.community .sect_commentlinks .directory li.member'), function (post, next) {
                var comment = {
                    foreign_key: $(post).attr('id'),
                    author: $(post).find('a.author h4:first').text(),
                    author_ref: $(post).find('a.author:first')[0].href,
                    body: $(post).find('p').text()
                };
                comments.push(comment);
                next();
            }, function (err) {
                window.close();
                cb(err, comments);
            });
        }
    ], function (err, comments) {
        callback(err, comments);
    });
};
