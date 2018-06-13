var express = require('express');
var config = require('../config');
var router = express.Router();

var WechatApi = require('co-wechat-api');
var wechat = new WechatApi(config.wetchat.appid, config.wetchat.appSecret);
var jsSHA = require('jssha');

/* GET home page. */
router.get('/', function(req, res, next) {
  console.debug(req.query);
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
  console.debug(result);
  res.status(200).send(result);
})

const wechatSignVerify = (signature, timestamp, nonce) => {
  let arr = [nonce, timestamp, config.wetchat.token]
  arr.sort();

  let original = arr.join('');
  let shaObj = new jsSHA('SHA-1', 'TEXT');
  shaObj.update(original);
  let scyptoString = shaObj.getHash('HEX');
  console.debug(scyptoString + "  :   " + signature);
  return scyptoString === signature;
}

module.exports = router;
