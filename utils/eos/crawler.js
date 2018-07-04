import symbol from './symbol';
import { AsSet, asSetOfRamBytes } from './asset'
import assert from 'assert';

const DEFAULT_TRANS_CACHE_COUNT = 500;
const RAM_TRADE_ACTIONS = [symbol.BUY_RAM_ACTION, symbol.BUY_RAM_BYTES_ACTION, symbol.SELL_RAM_ACTION];

function mergeCrawlerFuncs(eos) {
    Object.assign(eos, {
        _transCache: TransCache(DEFAULT_TRANS_CACHE_COUNT),

        /**
         * get transactions with cache
         * @param {string} id transaction id
         */
        getTransactionWithCache(id) {
            let that = this;
            let trans = this._transCache.get(id);
            if (trans) {
                //console.debug('hit transaction cache');
                return Promise.resolve(trans);
            }

            return new Promise(async (resolve, reject) => {
                try {
                    let trans = await this.getTransaction(id);
                    that._transCache.add(trans.id, trans);
                    resolve(trans);
                } catch (error) {
                    reject(error);
                }
            })
        },

        isRamTradeInlineTransferAction(transfer) {
            let valid = transfer && transfer.action_trace;
            if (!valid) return false;
            let trace = transfer.action_trace;
            let act = trace.act;


            return act.account === symbol.SYS_TOKEN_ACCOUNT &&
                act.name === symbol.TRANSFER_ACTION &&
                (act.data.from === symbol.RAM_ACCOUNT || act.data.to === symbol.RAM_ACCOUNT);
        },

        crawlRamTradeInfoFromTransferAction(trsfrAction) {
            if (!this.isRamTradeInlineTransferAction(trsfrAction)) {
                return Promise.resolve({
                    valid: false,
                    success: false,
                    srcAction: trsfrAction,
                    error: "invalid transfer form RAM trade."
                });
            }

            return new Promise(async (resolve, reject) => {
                try {
                    let transId = trsfrAction.action_trace.trx_id;
                    let trans = await this.getTransactionWithCache(transId);

                    let tradeAction = trans.traces.find((trace) => {
                        let act = trace.act;
                        return act.account === symbol.SYS_ACCOUNT &&
                            RAM_TRADE_ACTIONS.findIndex((a) => {
                                return a === act.name
                            }) >= 0 &&
                            trace.inline_traces.findIndex((t) => {
                                return t.receipt.act_digest === trsfrAction.action_trace.receipt.act_digest
                            }) >= 0
                    })
                    if (!tradeAction) {
                        reject({
                            valid: false,
                            success: false,
                            srcAction: trsfrAction,
                            error: "can't find ram trade info from this action"
                        })
                        return;
                    }

                    let tradeAct = tradeAction.act

                    let tradeInfo = {
                        time: trans.block_time,
                        transId,
                        action: tradeAct.name,
                        actId: trsfrAction.global_action_seq
                    }

                    if (tradeAct.name === symbol.SELL_RAM_ACTION) {
                        Object.assign(tradeInfo, {
                            operator: tradeAct.data.account,
                            reciver: tradeAct.data.account,
                            bytes: 1 * parseInt(tradeAct.data.bytes),
                            price: AsSet(trsfrAction.action_trace.act.data.quantity),
                            fee: AsSet(tradeAction.inline_traces.find((t) => {
                                return t.act.name === symbol.TRANSFER_ACTION && t.act.data.to === symbol.RAM_FEE_ACCOUNT && t.act.data.from === tradeAct.data.account
                            }).act.data.quantity)
                        })
                    } else {
                        Object.assign(tradeInfo, {
                            operator: tradeAct.data.payer || tradeAct.data.account,
                            reciver: tradeAct.data.receiver || tradeAct.data.account,
                            price: AsSet(trsfrAction.action_trace.act.data.quantity),
                            fee: AsSet(tradeAction.inline_traces.find((t) => {
                                return t.act.name === symbol.TRANSFER_ACTION && t.act.data.to === symbol.RAM_FEE_ACCOUNT && (t.act.data.from === tradeAct.data.payer || tradeAct.data.account)
                            }).act.data.quantity)
                        })
                        if (tradeAct.name === symbol.BUY_RAM_BYTES_ACTION) {
                            tradeInfo.bytes = parseInt(tradeAct.data.bytes)
                        }
                    }
                    resolve(tradeInfo);
                } catch (error) {
                    reject({
                        valid: true,
                        success: false,
                        srcAction: trsfrAction,
                        error,
                    });
                }
            })

        }
    })
}

module.exports = mergeCrawlerFuncs;

function TransCache(size) {
    return {
        size: size && size > 1 ? size : DEFAULT_TRANS_CACHE_COUNT,
        cache: new Map(),
        idList: [],

        get(id) {
            return id ? this.cache.get(id) : null;
        },

        add(id, trans) {
            assert(id && id.length > 0 && trans, "invalid id or transaction")
            if (!this.cache.has(id)) {
                this.idList.push(id);
            }
            this.cache.set(id, trans);
            if (this.idList.length >= this.size) {
                this.shift();
            }
        },

        shift() {
            let id = this.idList.shift();
            if (id) {
                this.cache.delete(id)
            }
            return this.idList.length;
        },
    }
}