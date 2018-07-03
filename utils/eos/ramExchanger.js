
import assert from 'assert';
import symbol from './symbol';
import { AsSet } from './asset'


function RamExchanger(market) {
    const exchanger = {
        market: JSON.parse(JSON.stringify(market)), //deep copy

        convert(from, toSymbol) {
            const baseSymbol = symbol.RAM_SYMBOL;
            const quoteSymbol = symbol.EOS_SYMBOL;
            const exSymbol = symbol.RAMCORE_SYMBOL;
            const sellSymbol = from.symbol;

            if (sellSymbol !== exSymbol) {
                if (sellSymbol === baseSymbol) {
                    from = this.convertToExchange(this.market.base, from);
                } else if (sellSymbol === quoteSymbol) {
                    from = this.convertToExchange(this.market.quote, from);
                } else {
                    assert(false, "invalid conversion");
                }
            } else {
                if (toSymbol === baseSymbol) {
                    from = this.convertFromExchange(this.market.base, from, market);
                } else if (toSymbol === quoteSymbol) {
                    from = this.convertFromExchange(this.market.quote, from, market);
                } else {
                    assert(false, "invalid conversion");
                }
            }

            if (toSymbol != from.symbol)
                return this.convert(from, toSymbol);

            return from;
        },

        convertToExchange(c, from) {
            let market = this.market;

            let R = parseFloat(market.supply.amountInt64);
            let C = parseFloat(c.balance.amountInt64) + parseFloat(from.amountInt64);
            let F = parseFloat(c.weight) / 1000.0;
            let T = parseFloat(from.amountInt64);
            const ONE = 1.0;
            let E = parseInt(-R * (ONE - Math.pow(ONE + T / C, F)));

            market.supply.amountInt64 += E;
            c.balance.amountInt64 += from.amountInt64;

            return AsSet({
                amountInt64: E,
                precision: market.supply.precision,
                symbol: market.supply.symbol
            })
        },

        convertFromExchange(c, from) {
            let market = this.market;
            let R = parseFloat(market.supply.amountInt64 - from.amountInt64);
            let C = parseFloat(c.balance.amountInt64);
            let F = 1000.0 / parseFloat(c.weight);
            let E = parseFloat(from.amountInt64);
            const ONE = 1.0;
            let T = parseInt(C * (Math.pow(ONE + E / R, F) - ONE));

            market.supply.amountInt64 -= from.amountInt64;
            c.balance.amountInt64 -= T;
            return AsSet({
                amountInt64: T,
                precision: c.balance.precision,
                symbol: c.balance.symbol
            });
        }
    };

    return exchanger;
}

module.exports = RamExchanger;