const debug = require('debug')('ramTracker:main');
const program = require('commander');
const config = require('../config');
const eosHelper = require('../utils/eos/eosHelper');
const eos = eosHelper.Eos(config.eos.getEnv());
import Elasticsearch from 'elasticsearch';

import RamCrawler from '../crawlers/ramCrawler';

var esClient = new Elasticsearch.Client({
    host: config.crawler.elasticsearchHost,
})

program.option('-r, --renew', "renew the database.")
    .parse(process.argv);

var crawler = RamCrawler({
    eos: eos,
    esClient,
}, program.renew);

//start process
main();

//-------------------------
async function main() {
    try {
        console.log('checking elasticSearch connection')
        await checkESState(); //if connected, will throw exception
        console.log('elasticSearch is OK.')
        console.log('start to crawle EOW RAM trade log......')
        await crawler.start();
        console.log('process closed.')
    } catch (err) {
        console.log(err);
    }
}

async function checkESState() {
    return await esClient.ping({
            requestTimeout: 10000
        });
}

