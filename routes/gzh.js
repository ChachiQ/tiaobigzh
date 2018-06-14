const express = require('express');
const config = require('../config');
const router = express.Router();
const debug = require('debug')('app:gzh');

const WechatApi = require('co-wechat-api');
const wechat = new WechatApi(config.wetchat.appid, config.wetchat.appSecret);
const wechatHelper = require('../utils/wechat');

var createHttpError = require('http-errors');

router.use('/', (req, res, next) => { //微信校验
    debug(req.query);
    if (req.path === "/") {
        let signature = req.query.signature;
        let timestamp = req.query.timestamp;
        let nonce = req.query.nonce;
        if (signature && timestamp && nonce) {
            if (wechatHelper.verifySignature(signature, timestamp, nonce)) {
                next();
                return;
            }
        }
        next(createHttpError(403));
        return;
    }
    next();
})

router.route('/')
    .get((req, res, next) => {
        let echostr = req.query.echostr;
        if (echostr) {
            res.send(echostr);
            return;
        }
        res.sendStatus(200);
    })
    .post((req, res, next) => { //微信事件推送
        var buffer = [];
        //监听 data 事件 用于接收数据
        req.on('data', function(data) {
            buffer.push(data);
        });
        //监听 end 事件 用于处理接收完成的数据
        req.on('end', async function() {
            //输出接收完成的数据
            let msgXml = Buffer.concat(buffer).toString('utf-8')
            debug(msgXml);

            try {
                let msg = await wechatHelper.parseMessage(msgXml, req);
                debug(msg);
                res.send('success');
            } catch (err) {
                res.status(400).send(err);
            }

        });
    });

router.get('/update_menu', async function (req, res, next) {
    let result = await wechat.createMenu(config.gzhMenu);
    debug(result);
    res.status(200).send(result);
})

module.exports = router;