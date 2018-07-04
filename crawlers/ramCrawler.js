import path from 'path';
import fs from 'fs';
import symbol from '../utils/eos/symbol';
import RamExchanger from '../utils/eos/ramExchanger';
import {asSetOfRamBytes,asSetOfEOS} from '../utils/eos/asset';


var RamCrawler = (opts, renew) => {
    let crawler = Object.assign({}, {
        eos: null,
        esClient: null, //elastic search instance
        ctxFileName: path.format({ //the context path of last run
            dir: process.cwd(),
            base: '.ram_crawler_ctx'
        }),
        ctx: null,

        async start() {
            await init(this, renew)
            console.log(`\n\ninit context environment`)
            console.log(`   last_action_id: ${this.ctx.lastActId}`)
            console.log(`   pos:    ${this.ctx.pos}`)
            console.log(`   offset: ${this.ctx.offset}`)
            console.log(`\nbegin crawle log....\n`)
            while (true) {
                let t = Date.now();
                let cnt = await crawleNextRamActions(crawler);
                t = parseInt( (Date.now() - t)/1000.0);
                if(cnt === 0){
                    console.log(`no more RAM TRADE action, the last action Id is ${this.ctx.lastActId}`)
                    console.log('sleep 5 seconds, and try again...');
                    await sleep(5000);
                }else{
                    console.log(`crawled logs, page: ${this.ctx.pos} , count: ${this.ctx.offset}, last_action_id: ${this.ctx.lastActId}, used ${t} seconds`);
                }
            }
            
        }
    }, opts);
    return crawler;
}

export default RamCrawler;

async function crawleNextRamActions(crawler) {
    let rsp = await crawler.eos.getActions(symbol.RAM_ACCOUNT, crawler.ctx.pos, crawler.ctx.offset-1);
    
    if(rsp.actions.length === 0){
        return 0;
    }

    for await (const act of rsp.actions){
        await processRamTradeAction(crawler,act);
    }
    crawler.ctx.pos+=(crawler.ctx.pos+1)*crawler.ctx.offset;
    writeCtxToFile(crawler)
    return rsp.actions.length;
}

async function processRamTradeAction(crawler,act){
    let info = await crawler.eos.crawlRamTradeInfoFromTransferAction(act);

    if(info.actId <= crawler.lastActId){
        //这段数据之前已经存过
        return;
    }
    //console.log(`pos: ${crawler.ctx.pos}, ${info.actId}`);
    let log = {
        t:info.time,
        actId: info.actId,
        operator: info.operator,
        reciver: info.reciver,
        transId: info.transId,
        ram: info.bytes,
        fee: info.fee.amountInt64,
        amount: info.price.amountInt64 * info.action === symbol.SELL_RAM_ACTION ? 1 : -1,
        action: info.action,
    }
    if(info.action === symbol.BUY_RAM_ACTION){
        let ramExc = RamExchanger(crawler.ramExchanger.market);
        let bytes = ramExc.convert(info.price,'RAM');
        log.bytes = bytes;

        simulateBuyTrade(crawler,info.price)
    }else if(info.action === symbol.BUY_RAM_BYTES_ACTION){
        log.bytes = info.bytes;

        let ramExc = RamExchanger(crawler.ramExchanger.market);
        let eosout = ramExc.convert(asSetOfRamBytes(info.bytes),'EOS');
        simulateBuyTrade(crawler,eosout);
    }else if(info.action === symbol.SELL_RAM_ACTION){ //sell ram
        log.bytes = - info.bytes;

        simulateSellTrade(crawler,asSetOfRamBytes(info.bytes));
    }else{ //unknown action
        throw 'unknown ram trade action';
    }
    //console.debug(`${log.action}, ${log.amount}, ${log.bytes?log.bytes:-1} bytes`)
    //console.debug(`base: ${crawler.ctx.market.base.balance.amountInt64} , quto: ${crawler.ctx.market.base.balance.amountInt64}\n`)

    let result = await crawler.esClient.index({
            index: RAM_TRADE_LOG_INDEX,
            type: "doc",
            id: log.actId.toString(),
            body: log,
        })
     
    if (result.result === "created" || result.result === "noop" || result.result === "updated"){
        crawler.ctx.lastActId = log.actId;
        writeCtxToFile(crawler);
    }else{
        console.log(result);
        throw `\nwrite log to db failed\n`
    }
}

async function init(crawler, renew) {

    if (renew) {
        console.log("\n reset the database.......")
        if (fs.existsSync(crawler.ctxFileName)) {
            fs.unlinkSync(crawler.ctxFileName);
        }
    }

    await createNewIndexsInrequired(crawler, renew);
    readCtxFromFile(crawler);
    crawler.ramExchanger = RamExchanger(crawler.ctx.market);
}

async function createNewIndexsInrequired(crawler, renew) {
    let es = crawler.esClient;
    let indexExists = await es.indices.exists({
        index: RAM_TRADE_LOG_INDEX
    });

    if (renew) {
        if (indexExists) {
            console.log(`\n delete the ${RAM_TRADE_LOG_INDEX} index`)
            await es.indices.delete({
                index: RAM_TRADE_LOG_INDEX,
            });
        }
    } else {
        if (!indexExists) {
            console.log(`\n crate the ${RAM_TRADE_LOG_INDEX} index`)
            await es.indices.create({
                index: RAM_TRADE_LOG_INDEX,
                body: {
                    mappings: {
                        doc: {
                            properties: RAM_TRADE_INFO_STRUCT.body
                        }
                    }
                }
            })
        }
    }
}

function readCtxFromFile(crawler) {
    if (!fs.existsSync(crawler.ctxFileName)) {
        fs.writeFileSync(crawler.ctxFileName, JSON.stringify(INIT_CTX));
        crawler.ctx = INIT_CTX;
    } else {
        crawler.ctx = JSON.parse(fs.readFileSync(crawler.ctxFileName));
    }
}

function writeCtxToFile(crawler) {
    fs.writeFileSync(crawler.ctxFileName, JSON.stringify(crawler.ctx || INIT_CTX));
}

function simulateBuyTrade(crawler,eosAsset){
    let eosAmount = eosAsset.amountInt64
    let feeAmount = parseInt((eosAmount + 199) / 200);
    let amountAfterFee = eosAmount - feeAmount;

    crawler.ramExchanger.convert({
        amountInt64: amountAfterFee,
        symbol: symbol.EOS_SYMBOL,
        precision: 4
    }, symbol.RAM_SYMBOL)
    //console.log(`...base: ${crawler.ramExchanger.market.base.balance.amountInt64} , quto: ${crawler.ramExchanger.market.base.balance.amountInt64}\n`)

    crawler.ctx.market = JSON.parse(JSON.stringify(crawler.ramExchanger.market));
}

function simulateSellTrade(crawler,ramAsset){
    crawler.ramExchanger.convert(ramAsset, symbol.EOS_SYMBOL)
    crawler.ctx.market = JSON.parse(JSON.stringify(crawler.ramExchanger.market));
    //console.log(`...base: ${crawler.ramExchanger.market.base.balance.amountInt64} , quto: ${crawler.ramExchanger.market.base.balance.amountInt64}\n`)
}

function sleep(ms = 0) {
    return new Promise(r => setTimeout(r, ms));
}

const INIT_CTX = {
    lastActId: -1,
    pos: 0,
    offset: 100,
    market: {
        supply: {
            amountInt64: 100000000000000,
            precision: 4,
            symbol: "RAMCORE"
        },
        base: {
            balance: {
                amountInt64: 64 * 1024 * 1024 * 1024,
                precision: 0,
                symbol: "RAM"
            },
            weight: "0.50000000000000000"
        },
        quote: {
            balance: {
                amountInt64: 1000000000 / 1000,
                precision: 4,
                symbol: "EOS"
            },
            weight: "0.50000000000000000"
        }
    }
}

const RAM_TRADE_LOG_INDEX = "eos_ram_trade_log";

const RAM_TRADE_INFO_STRUCT = {
    index: RAM_TRADE_LOG_INDEX,
    id: "transId",
    struct: {
        t: {
            type: "date"
        },
        operator: {
            type: "text"
        },
        receiver: {
            type: "text"
        },
        amount: {
            type: "long"
        },
        ram: {
            type: "long"
        },
        fee: {
            type: "long"
        },
        transId: {
            type: "text"
        },
        action: {
            type: "text"
        },
        actId: {
            type: "long",
        }
    }
}