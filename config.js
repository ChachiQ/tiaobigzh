module.exports = {
    debug: true,
    wetchat: {
        token: 'BNo8mYRKFqKCmI5HvABOW4AMy8emzgfw',
        appid: 'wx02c5e8fb3942e664',
        appSecret: '007db3dfe5334b40ab4263f6bb36b25e',
        encodingAESKey: 'OqQ155q1FkTJxJmLffCo3GR98UwUaaxXpI4O1WRWoAW',
        checkSignature: true // 可选，默认为true。由于微信公众平台接口调试工具在明文模式下不发送签名，所以如要使用该测试工具，请将其设置为false
    },
    gzhMenu: {
        "button": [
            {
                "type": "click",
                "name": "今日歌曲",
                "key": "V1001_TODAY_MUSIC"
            },
            {
                "name": "菜单",
                "sub_button": [
                    {
                        "type": "view",
                        "name": "搜索",
                        "url": "http://www.soso.com/"
                    },
                    {
                        "type": "click",
                        "name": "赞一下我们",
                        "key": "V1001_GOOD"
                    }]
            }]
    }
}