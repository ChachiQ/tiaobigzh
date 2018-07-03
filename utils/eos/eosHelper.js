import { Eos as EosLib } from 'eosjs';
import EosApi from 'eosjs-api';

import { AsSet, asSetOfRamBytes, asSetOfEOS } from './asset'
import * as symbol from './symbol';

import mergeRamFuncs from './ram';
import mergeCrawlerFuncs from './crawler';


function Eos(opts) {
    let instance = null;
    let config = Object.assign({}, {
        type: "local", //mainnet,local,testnet
        endpoint: 'http://127.0.0.1:8888',
        debug: false,
        writeable: false,
    }, opts)

    let options = {
        debug: config.debug,
        httpEndpoint: config.endpoint,
        chainId: config.chainId
    }
    if (!config.writeable) {
        instance = EosApi(options);
    } else {
        options = Object.assign({}, options, {
            keyProvider: eosEnv.wallet.prviateKey,
        });

        instance = EosLib(options);
    }
    mergeRamFuncs(instance);
    extendEosFunc(instance);
    mergeCrawlerFuncs(instance);

    return instance;
}



module.exports = {
    Eos,

    AsSet,
    asSetOfRamBytes,
    asSetOfEOS,
    symbol,
};

function extendEosFunc(eos) {
    Object.assign(eos, {
        getGlobalInfo() {
            return new Promise((resolve, reject) => {
                this.getTableRows({
                    scope: symbol.SYS_ACCOUNT,
                    code: symbol.SYS_ACCOUNT,
                    table: 'global',
                    json: true,
                    limit: 1
                }).then(result => {
                    resolve(result.rows[0]);
                }).catch(err => {
                    reject(err);
                })
            })
        }
    })

    return eos;
}

//----- Asset -------
