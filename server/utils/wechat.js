import { parseString } from "xml2js";
import crypto from "crypto";

var appRoot = require('app-root-path');
const config = require(appRoot + '/config');
const xmlParser = require('xml2js');
const buildXML = new xmlParser.Builder({
    rootName: 'xml',
    cdata: true,
    headless: true,
    renderOpts: {
        indent: ' ',
        pretty: 'true'
    }
}); //用于构建 xml 结构

const encodingAESKey = new Buffer(config.wetchat.encodingAESKey + '=', 'base64');
const iv = encodingAESKey.slice(0, 16);
const aesModel = 'aes-256-cbc';

function parseMessage(msgXml, req) {
    return new Promise((resolve, reject) => {
        parseString(msgXml, {
            explicitArray: false
        }, function(err, result) {
            if (!err) {
                result = result.xml;
                let query = req.query;
                //判断消息加解密方式
                if (query.encrypt_type === 'aes') {
                    //对加密数据解密
                    result = decryptMesage(result.Encrypt, query.timestamp, query.nonce, query.msg_signature)
                }
                resolve(result);
            } else {
                reject(err);
            }
        });
    });
}

function verifySignature(signature, timestamp, nonce, message) {
    let arr = [nonce, timestamp, config.wetchat.token];
    if (message) {
        arr.push(message);
    }
    let original = arr.sort().join('');
    let hashCode = crypto.createHash('sha1');
    let scyptoString = hashCode.update(original, 'utf8').digest('hex');
    return scyptoString === signature;
}

function getMessageSignature(message, timestamp, nonce) {
    let arr = [nonce, timestamp, config.wetchat.token, message];
    let original = arr.sort().join('');
    let hashCode = crypto.createHash('sha1');
    return hashCode.update(original, 'utf8').digest('hex');
}

function decryptMesage(encryptMsg, timestamp, nonce, signature) {
    //获取签名认证, 判断消息是否来自微信服务器
    if (!verifySignature(signature, timestamp, nonce, encryptMsg)) {
        throw new Error('message Signature is not invalid')
    }

    //实例 AES 解密对象
    var deCipheriv = crypto.createDecipheriv(aesModel, encodingAESKey, iv);
    //设置自定填充数据为 false
    deCipheriv.setAutoPadding(false);
    //对密文解密对密文解密 并去除前 16 个随机字符串
    var deEncryptedMsg = Buffer.concat([deCipheriv.update(encryptMsg, 'base64'), deCipheriv.final()]).toString('utf8');
    //获取填充字符串的位置
    var pad = deEncryptedMsg.charCodeAt(deEncryptedMsg.length - 1);
    //对微信消息进行处理
    deEncryptedMsg = deEncryptedMsg.slice(20, -pad).replace(/<\/xml>.*/, '</xml>');
    //讲解密后的XML 转为 JSON 对象
    return parseXmlToJSON(deEncryptedMsg);
}

/**
 * 生成XML文本消息
 * @param {String} toUser 接收用户
 * @param {String} fromUser 发送用户
 * @param {String}  content 发送消息
 */
function buildXmlTextMessage(toUser, fromUser, content) {
    var xmlContent = "<xml><ToUserName><![CDATA[" + toUser + "]]></ToUserName>";
    xmlContent += "<FromUserName><![CDATA[" + fromUser + "]]></FromUserName>";
    xmlContent += "<CreateTime>" + new Date().getTime() + "</CreateTime>";
    xmlContent += "<MsgType><![CDATA[text]]></MsgType>";
    xmlContent += "<Content><![CDATA[" + content + "]]></Content></xml>";
    return xmlContent;
}

/**
 * 生成XML图文消息
 * @param {String} toUser 接收用户
 * @param {String} fromUser 发送用户
 * @param {Array}  contentArr 图文信息集合
 */
function buildXmlGraphicMessage(toUser, fromUser, contentArr) {
    var xmlContent = "<xml><ToUserName><![CDATA[" + toUser + "]]></ToUserName>";
    xmlContent += "<FromUserName><![CDATA[" + fromUser + "]]></FromUserName>";
    xmlContent += "<CreateTime>" + new Date().getTime() + "</CreateTime>";
    xmlContent += "<MsgType><![CDATA[news]]></MsgType>";
    xmlContent += "<ArticleCount>" + contentArr.length + "</ArticleCount>";
    xmlContent += "<Articles>";
    contentArr.map(function(item, index) {
        xmlContent += "<item>";
        xmlContent += "<Title><![CDATA[" + item.Title + "]]></Title>";
        xmlContent += "<Description><![CDATA[" + item.Description + "]]></Description>";
        xmlContent += "<PicUrl><![CDATA[" + item.PicUrl + "]]></PicUrl>";
        xmlContent += "<Url><![CDATA[" + item.Url + "]]></Url>";
        xmlContent += "</item>";
    });
    xmlContent += "</Articles></xml>";
    return xmlContent;
}

function encryptMsg(xmlMsg, timestamp, nonce) {
    //声明 16位的随机字符串
    var random = crypto.randomBytes(8).toString('hex');
    var text = new Buffer(xmlMsg);
    var buf = new Buffer(4);
    buf.writeUInt32BE(text.length);
    //进行PKCS7补位
    var pack = KCS7Encoder(20 + text.length + config.wetchat.appid.length);
    //拼接要加密的字符串
    var content = random + buf.toString('binary') + text.toString('binary') + config.wetchat.appid + pack;
    //实例 AES 加密对象
    var cipheriv = crypto.createCipheriv(aesModel, encodingAESKey, iv);
    //设置自定填充数据为 false
    cipheriv.setAutoPadding(false);
    //对明文加密
    var encryptedMsg = Buffer.concat([cipheriv.update(content, 'binary'), cipheriv.final()]).toString('base64');
    //获取认证签名
    var msgSignature = getMessageSignature(encryptedMsg, timestamp, nonce);
    //返回XML结果
    return buildXML.buildObject({
        Encrypt: encryptedMsg,
        MsgSignature: msgSignature,
        TimeStamp: timestamp,
        Nonce: nonce
    });
}

/**
 * 根据request判断是否需要进行加密;
 *  如果需要加密，返回加密后的字符串
 *  如果不需要加密，返回原文
 * @param {String} xmlMsg XML字符串
 * @param {Request} req reqeuest
 */
function encryptMessageIfRequired(xmlMsg, req) {
    return req.query.encrypt_type === 'aes' ? encryptMsg(xmlMsg) : xmlMsg;
}

function parseXmlToJSON(xml) {
    if (!xml || typeof xml != 'string') return {};
    var re = {};
    xml = xml.replace(/^<xml>|<\/xml>$/g, '');
    var ms = xml.match(/<([a-z0-9]+)>([\s\S]*?)<\/\1>/ig);
    if (ms && ms.length > 0) {
        ms.forEach(t => {
            let ms = t.match(/<([a-z0-9]+)>([\s\S]*?)<\/\1>/i);
            let tagName = ms[1];
            let cdata = ms[2] || '';
            cdata = cdata.replace(/^\s*<\!\[CDATA\[\s*|\s*\]\]>\s*$/g, '');
            re[tagName] = cdata;
        });
    }
    return re;
}

/**
 * PKCS7补位 算法
 * @param {Number} text_length  字符串长度
 */
function KCS7Encoder(text_length) {
    var block_size = 32
    // 计算需要填充的位数
    var amount_to_pad = block_size - (text_length % block_size);
    if (amount_to_pad === 0) {
        amount_to_pad = block_size;
    }
    // 获得补位所用的字符
    var pad = String.fromCharCode(amount_to_pad),
        s = [];
    for (var i = 0; i < amount_to_pad; i++) s.push(pad);
    return s.join('');
}

module.exports = {
    verifySignature,
    parseMessage,
    encryptMessageIfRequired,
    buildXmlTextMessage,
    buildXmlGraphicMessage,
};