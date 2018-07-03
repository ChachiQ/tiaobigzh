import * as symbol from './symbol';

const eosFormatter = require('eosjs/lib/format');

module.exports = {
    AsSet,
    asSetOfEOS,
    asSetOfRamBytes,
}

function AsSet(src) {
    let asset = src;
    if (typeof (asset) === 'string') {
        asset = eosFormatter.parseAsset(src);
        asset.amountInt64 = parseInt(eosFormatter.DecimalImply(asset.amount));
        delete asset.amount;
    }


    let newAsSet = {
        amountInt64: 0,
        precision: 0,
        symbol: null,

        amountStr() {
            return eosFormatter.DecimalUnimply(this.amountInt64, this.precision);
        },
        toString() {
            let t = Object.assign({}, this, {
                amount: this.amountStr()
            })
            return eosFormatter.printAsset(t);
        }
    }
    Object.assign(newAsSet, asset)
    return newAsSet;
}

function asSetOfRamBytes(bytes) {
    return AsSet({
        amountInt64: parseInt(bytes),
        precision: 0,
        symbol: symbol.RAM_SYMBOL,
    })
}

function asSetOfEOS(eosAmount) {
    return AsSet({
        amountInt64: parseInt(eosAmount * 10000),
        precision: 4,
        symbol: symbol.EOS_SYMBOL,
    })
}