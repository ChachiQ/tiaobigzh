const express = require('express');
var appRoot = require('app-root-path');
const config = require(appRoot + '/config');
const router = express.Router();
const debug = require('debug')('app:eos');

const eosHelper = require('../utils/eos/eosHelper');
const eos = eosHelper.Eos(config.eos.getEnv());

router.get('/', async function(req, res, next) {
    let amount = req.query.amount || 1024
    let info = await eos.getGlobalRamInfo();

    res.send(eos.evaluateRamPrice(amount, info.market));
// res.send(info);
});

router.get('/actions', async function (req, res, next) {
    let qs = req.query;
    let result = await eos.getActions(qs.account, qs.pos || 0, qs.offset || 10);
    res.send(result);
})

router.get('/transaction', async function(req, res, next) {
    let result = await eos.getTransactionWithCache(req.query.id);
    res.send(result);
})

router.get('/ram', async function (req, res, next) {
    let qs = req.query;
    let actions = await eos.getActions('eosio.ram', qs.pos || -1, qs.offset || -10);
    console.log(actions);
    let result = await eos.crawlRamTradeInfoFromTransferAction(actions.actions[0]);
    res.send(result);
})

module.exports = router;