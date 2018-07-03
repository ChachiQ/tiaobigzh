
import symbol from './symbol';
import { AsSet, asSetOfRamBytes } from './asset'
import RamExchanger from './ramExchanger'



function mergeRamFuncs(eos) {
    Object.assign(eos, {
        /**
            * get RAM Makert Table info
        */
        getRamMarketInfo() {
            return new Promise((resolve, reject) => {
                this.getTableRows({
                    scope: symbol.SYS_ACCOUNT,
                    code: symbol.SYS_ACCOUNT,
                    table: 'rammarket',
                    json: true,
                    limit: 1
                }).then(result => {
                    let ramMarket = result.rows[0];
                    resolve({
                        supply: AsSet(ramMarket.supply),
                        base: {
                            balance: AsSet(ramMarket.base.balance),
                            weight: ramMarket.base.weight
                        },
                        quote: {
                            balance: AsSet(ramMarket.quote.balance),
                            weight: ramMarket.quote.weight
                        },
                    },);
                }).catch(err => {
                    reject(err);
                })
            })
        },

        /**
        * evaluate the price of the RAM bytes
        * @param {int} byteAmount 
        * @param {marketInfo} ramMarket 
        */
        evaluateRamPrice(byteAmount, ramMarket) {
            let exchanger = RamExchanger(ramMarket);

            let eosout = exchanger.convert(asSetOfRamBytes(byteAmount), symbol.EOS_SYMBOL);
            let freeAmount = parseInt((eosout.amountInt64 + 199) / 200);
            let afterPricePerKb = exchanger.convert(asSetOfRamBytes(1024), symbol.EOS_SYMBOL);

            let exchanger1 = RamExchanger(ramMarket);
            let prePricePerKb = exchanger1.convert(asSetOfRamBytes(1024), symbol.EOS_SYMBOL)

            return {
                price: eosout,
                fee: AsSet({
                    amountInt64: freeAmount,
                    symbol: symbol.EOS_SYMBOL,
                    precision: 4,
                }),
                prePricePerKb,
                afterPricePerKb,
            }
        },

        /**
        * evaluate RAM bytes that the eosAmount could buy
        * @param {float} eosAmount 
        * @param {marketInfo} ramMarket 
        */
        evaluateRamBytes(eosAmount, ramMarket) {
            eosAmount = parseInt(eosAmount * 10000);
            let feeAmount = parseInt((eosAmount + 199) / 200);
            let amountAfterFee = eosAmount - feeAmount;

            let exchanger = RamExchanger(ramMarket);
            let bytesOut = exchanger.convert({
                amountInt64: amountAfterFee,
                symbol: symbol.EOS_SYMBOL,
                precision: 4
            }, symbol.RAM_SYMBOL)
            return {
                bytes: bytesOut.amountStr(),
                fee: AsSet({
                    amountInt64: feeAmount,
                    symbol: symbol.EOS_SYMBOL,
                    precision: 4,
                }),
            }
        },

        /**
        * get an merged global RAM Market report
        */
        getGlobalRamInfo() {
            let pGlobal = this.getGlobalInfo();
            let pRam = this.getRamMarketInfo();
            return new Promise((resolve, reject) => {
                Promise.all([pGlobal, pRam]).then(([global, market]) => {
                    let res = {
                        maxSize: global.max_ram_size,
                        totalReserved: global.total_ram_bytes_reserved,
                        totalStake: AsSet({
                            amountInt64: global.total_ram_stake,
                            symbol: symbol.EOS_SYMBOL,
                            precision: 4,
                        }),
                        market,
                    }
                    resolve(res);
                }).catch(err => reject(err));
            })
        },

    })
}

module.exports = mergeRamFuncs;
