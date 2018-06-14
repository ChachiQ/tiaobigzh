var express = require('express');
var config = require('../config');
var router = express.Router();
var debug = require('debug')('app.gzh');

var WechatApi = require('co-wechat-api');
var wechat = new WechatApi(config.wetchat.appid, config.wetchat.appSecret);

var jsSHA = require('jssha');

var createHttpError = require('http-errors');

router.use('/', (req, res, next) => { //微信校验
    debug(req.query);
    if (req.path === "/") {
        let signature = req.query.signature;
        let timestamp = req.query.timestamp;
        let nonce = req.query.nonce;
        if (signature && timestamp && nonce) {
            if (wechatSignVerify(signature, timestamp, nonce)) {
                next();
            }
        }
        next(createHttpError(403));
    }
    next();
})

router.route('/')
    .get((req, res, next) => {
        let echostr = req.query.echostr;
        if (echostr) {
            res.send(echostr);
        }
        res.sendStatus(200);
    })
    .post((req, res, next) => { //微信事件推送
        debug(req);
        debug(req.rawHeaders)
        debug(req.body);
        debug(req.params);

        let signature = req.query.signature;
        let timestamp = req.query.timestamp;
        let echostr = req.query.echostr;
        let nonce = req.query.nonce;
        if (signature && timestamp && echostr) {
            if (wechatSignVerify(signature, timestamp, nonce)) {
                res.send(echostr);
                return;
            }
        }
        res.sendStatus(200);
    });

router.get('/update_menu', async function (req, res, next) {
    let result = await wechat.createMenu(config.gzhMenu);
    debug(result);
    res.status(200).send(result);
})

const wechatSignVerify = (signature, timestamp, nonce) => {
    let arr = [nonce, timestamp, config.wetchat.token]
    arr.sort();

    let original = arr.join('');
    let shaObj = new jsSHA('SHA-1', 'TEXT');
    shaObj.update(original);
    let scyptoString = shaObj.getHash('HEX');
    debug(scyptoString + "  :   " + signature);
    return scyptoString === signature;
}

module.exports = router;