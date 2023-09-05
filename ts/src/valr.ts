
//  ---------------------------------------------------------------------------

import Exchange from './abstract/valr.js';
import { ExchangeError, ArgumentsRequired } from './base/errors.js';
import { TICK_SIZE } from './base/functions/number.js';
import { Int } from './base/types.js';
import { sha512 } from './static_dependencies/noble-hashes/sha512.js';
// import { Int, OrderSide, OrderType } from './base/types.js';

//  ---------------------------------------------------------------------------

/**
 * @class valr
 * @extends Exchange
 */
export default class valr extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'valr',
            'name': 'valr',
            'countries': [ 'ZA' ],
            // 1000 calls per minute = 16.66 calls per second = 1000ms / 16.66 = 60ms between requests
            // TODO: rate limit pools
            'rateLimit': 60,
            'pro': false,
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': true,
                'swap': true,
                'future': false,
                'option': false,
                'addMargin': false,
                'cancelOrder': true,
                'createOrder': true,
                'createReduceOnlyOrder': false,
                'fetchAccounts': true,
                'fetchBalance': true,
                'fetchBorrowRate': false,
                'fetchBorrowRateHistory': false,
                'fetchBorrowRates': false,
                'fetchBorrowRatesPerSymbol': false,
                'fetchClosedOrders': false,
                'fetchFundingHistory': false,
                'fetchFundingRate': false,
                'fetchFundingRateHistory': false,
                'fetchFundingRates': false,
                'fetchIndexOHLCV': false,
                'fetchLedger': false,
                'fetchLeverage': false,
                'fetchLeverageTiers': false,
                'fetchMarginMode': false,
                'fetchMarkets': true,
                'fetchMarkOHLCV': false,
                'fetchMyTrades': true,
                'fetchOHLCV': false, // overload of base fetchOHLCV, as it doesn't work in this exchange
                'fetchOpenInterestHistory': false,
                'fetchOpenOrders': true,
                'fetchOrder': true,
                'fetchOrderBook': true,
                'fetchOrders': true,
                'fetchPosition': false,
                'fetchPositionMode': false,
                'fetchPositions': false,
                'fetchPositionsRisk': false,
                'fetchPremiumIndexOHLCV': false,
                'fetchStatus': true,
                'fetchTicker': true,
                'fetchTickers': true,
                'fetchTrades': true,
                'fetchTradingFee': false,
                'fetchTradingFees': false,
                'reduceMargin': false,
                'setLeverage': false,
                'setMarginMode': false,
                'setPositionMode': false,
            },
            'urls': {
                'referral': 'https://www.valr.com/invite/VAMKCHNT',
                'logo': '',
                'api': 'https://api.valr.com',
                'www': 'https://www.valr.com',
                'doc': [
                    'https://docs.valr.com',
                ],
            },
            'api': {
                'v1': {
                    'public': {
                        'get': {
                            'public/marketsummary': 1,
                            'public/{pair}/marketsummary': 1,
                            'public/pairs': 1,
                            'public/{pair}/trades': 1,
                            'public/{pair}/orderbook': 1,
                            'public/time': 1,
                            'public/status': 1,
                        },
                    },
                    'private': {
                        'get': {
                            'account/balances': 1,
                            'account/subaccounts': 1,
                            'account/{pair}/tradehistory': 1,
                            'marketdata/{pair}/tradehistory': 1,
                            'orders/{pair}/orderid/{orderId}': 1,
                            'orders/open': 1,
                            'orders/history': 1,
                        },
                    },
                },
            },
            'fees': {
                'trading': {
                    'tierBased': false,
                    'percentage': true,
                    'taker': this.parseNumber ('0.001'),
                    'maker': this.parseNumber ('-0.0001'),
                },
            },
            'precisionMode': TICK_SIZE,
        });
    }

    async fetchMarkets (params = {}) {
        /**
         * @method
         * @name valr#fetchMarkets
         * @description retrieves data on all markets for valr
         * @param {object} [params] extra parameters specific to the exchange api endpoint
         * @returns {object[]} an array of objects representing market data
         */
        const response = await this.v1PublicGetPublicPairs (params);
        // [
        //     {
        //         "symbol": "BTCZAR",
        //         "baseCurrency": "BTC",
        //         "quoteCurrency": "ZAR",
        //         "shortName": "BTC/ZAR",
        //         "active": true,
        //         "minBaseAmount": "0.00001",
        //         "maxBaseAmount": "9",
        //         "minQuoteAmount": "10",
        //         "maxQuoteAmount": "5000000",
        //         "tickSize": "1",
        //         "baseDecimalPlaces": "8",
        //         "marginTradingAllowed": true,
        //         "currencyPairType": "SPOT"
        //     },
        //     {
        //         "symbol": "ETHZAR",
        //         "baseCurrency": "ETH",
        //         "quoteCurrency": "ZAR",
        //         "shortName": "ETH/ZAR",
        //         "active": true,
        //         "minBaseAmount": "0.001",
        //         "maxBaseAmount": "240",
        //         "minQuoteAmount": "10",
        //         "maxQuoteAmount": "5000000",
        //         "tickSize": "1",
        //         "baseDecimalPlaces": "8",
        //         "marginTradingAllowed": false
        //         "currencyPairType": "SPOT"
        //     },
        // ]
        const result = [];
        for (let i = 0; i < response.length; i++) {
            const market = response[i];
            const id = this.safeString (market, 'symbol');
            const baseId = this.safeString (market, 'baseCurrency');
            const quoteId = this.safeString (market, 'quoteCurrency');
            const base = this.safeCurrencyCode (baseId);
            const quote = this.safeCurrencyCode (quoteId);
            const active = this.safeValue (market, 'active');
            const margin = this.safeValue (market, 'marginTradingAllowed');
            const currencyPairType = this.safeString (market, 'currencyPairType');
            const spot = currencyPairType === 'SPOT';
            const future = currencyPairType === 'FUTURE';
            result.push ({
                'id': id,
                'symbol': id,
                'base': base,
                'quote': quote,
                'baseId': baseId,
                'quoteId': quoteId,
                'type': future ? 'swap' : 'spot',
                'spot': spot,
                'margin': margin,
                'future': false, // whether the market is a expiring future. VALR does not support expiring futures
                'swap': future,  // whether the market is a perpetual swap. VALR futures are perpetual futures / swaps
                'contract': future,
                'contractSize': future ? 1 : undefined,
                'settle': future ? quoteId : undefined,
                'settleId': future ? quoteId : undefined,
                'linear': future ? true : undefined,
                'inverse': future ? false : undefined,
                'active': active,
                'precision': {
                    'amount': this.parseNumber (this.parsePrecision (this.safeString (market, 'baseDecimalPlaces'))),
                    'price': this.parseNumber (this.parsePrecision (this.safeString (market, 'tickSize'))),
                },
                'limits': {
                    'amount': {
                        'min': this.safeNumber (market, 'minBaseAmount'),
                        'max': this.safeNumber (market, 'maxBaseAmount'),
                    },
                    'price': {
                        'min': this.safeNumber (market, 'minQuoteAmount'),
                        'max': this.safeNumber (market, 'minMaxAmount'),
                    },
                },
                'info': market,
            });
        }
        return result;
    }

    async fetchAccounts (params = {}) {
        /**
         * @method
         * @name valr#fetchAccounts
         * @description fetch all the accounts associated with a profile
         * @param {object} [params] extra parameters specific to the valr api endpoint
         * @returns {object} a dictionary of [account structures]{@link https://github.com/ccxt/ccxt/wiki/Manual#account-structure} indexed by the account type
         */
        const response = await this.v1PrivateGetAccountSubaccounts (params);
        const result = [];
        for (let i = 0; i < response.length; i++) {
            const account = response[i];
            const accountId = this.safeString (account, 'id');
            const name = this.safeString (account, 'label');
            result.push ({
                'id': accountId,
                'name': name,
                'code': undefined,
                'type': 'subaccount',
                'info': account,
            });
        }
        return result;
    }

    parseBalance (response) {
        const result = {
            'info': response,
            'timestamp': undefined,
            'datetime': undefined,
        };
        for (let i = 0; i < response.length; i++) {
            const wallet = response[i];
            const currencyId = this.safeString (wallet, 'currency');
            const code = this.safeCurrencyCode (currencyId);
            const available = this.safeString (wallet, 'available');
            const reserved = this.safeString (wallet, 'reserved');
            const total = this.safeString (wallet, 'total');
            const account = this.account ();
            account['free'] = available;
            account['used'] = reserved;
            account['total'] = total;
            result[code] = account;
        }
        return this.safeBalance (result);
    }

    async fetchBalance (params = {}) {
        /**
         * @method
         * @name valr#fetchBalance
         * @description query for balance and get the amount of funds available for trading or funds locked in orders
         * @param {object} [params] extra parameters specific to the valr api endpoint
         * @returns {object} a [balance structure]{@link https://github.com/ccxt/ccxt/wiki/Manual#balance-structure}
         */
        await this.loadMarkets ();
        params['excludeZeroBalances'] = 'true';
        const response = await this.v1PrivateGetAccountBalances (params);
        // [
        //     {
        //         "currency": "ZAR",
        //         "available": "44822.97549155",
        //         "reserved": "99.99925",
        //         "total": "145612.43129945",
        //         "updatedAt": "2023-04-25T09:00:04.406Z",
        //         "lendReserved": "100000",
        //         "borrowReserved": "689.4565579",
        //         "borrowedAmount": "0",
        //         "totalInReference": "7828.62533868",
        //         "totalInReferenceWeighted": "7828.62533868",
        //         "referenceCurrency": "USDC"
        //     },
        // ]
        return this.parseBalance (response);
    }

    async fetchOrderBook (symbol: string, limit: Int = undefined, params = {}) {
        /**
         * @method
         * @name valr#fetchOrderBook
         * @description fetches information on open orders with bid (buy) and ask (sell) prices, volumes and other data
         * @param {string} symbol unified symbol of the market to fetch the order book for
         * @param {int} [limit] the maximum amount of order book entries to return
         * @param {object} [params] extra parameters specific to the valr api endpoint
         * @returns {object} A dictionary of [order book structures]{@link https://github.com/ccxt/ccxt/wiki/Manual#order-book-structure} indexed by market symbols
         */
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'pair': market['id'],
        };
        const response = await this.v1PublicGetPublicPairOrderbook (this.extend (request, params));
        const timestamp = this.parse8601 (this.safeString (response, 'LastChange'));
        return this.parseOrderBook (response, market['symbol'], timestamp, 'Bids', 'Asks', 'price', 'quantity');
    }

    parseOrderStatus (status) {
        const statuses = {
            'Pending': 'open',
            'Partially Filled': 'open',
            'Filled': 'closed',
            'Canceled': 'canceled',
            'Failed': 'canceled',
            'New': 'open',
            'Open': 'open',
        };
        return this.safeString (statuses, status, 'open');
    }

    parseOrder (order, market = undefined) {
        // {
        //   "orderId": "ba9c27b6-466d-493d-9d06-984cf14e5e2f",
        //   "orderStatusType": "Failed",
        //   "currencyPair": "BTCZAR",
        //   "originalPrice": "7001",
        //   "remainingQuantity": "0",
        //   "originalQuantity": "0",
        //   "orderSide": "buy",
        //   "orderType": "market",
        //   "failedReason": "We did not execute this order since it would have matched with your own order on the Exchange",
        //   "orderUpdatedAt": "2021-02-02T12:19:44.548Z",
        //   "orderCreatedAt": "2021-02-02T12:19:44.541Z",
        //   "customerOrderId": "90973",
        //   "timeInForce": "GTC"
        // }
        const createdAt = this.safeString (order, 'orderCreatedAt');
        const updatedAt = this.safeString (order, 'orderUpdatedAt');
        const timestamp = this.parse8601 (createdAt);
        const status = this.parseOrderStatus (this.safeString (order, 'orderStatusType'));
        const orderType = this.safeString (order, 'orderType');
        const side = this.safeString (order, 'orderSide');
        const marketId = this.safeString (order, 'currencyPair');
        market = this.safeMarket (marketId, market);
        const price = this.safeString (order, 'originalPrice');
        const amount = this.safeString (order, 'originalQuantity');
        const remaining = this.safeString (order, 'remainingQuantity');
        const id = this.safeString (order, 'orderId');
        const clientOrderId = this.safeString (order, 'customerOrderId');
        const stopPrice = this.safeString (order, 'stopPrice');
        const timeInForce = this.safeString (order, 'timeInForce');
        return this.safeOrder ({
            'id': id,
            'clientOrderId': clientOrderId,
            'datetime': createdAt,
            'timestamp': timestamp,
            'lastTradeTimestamp': this.parse8601 (updatedAt),
            'status': status,
            'symbol': market['symbol'],
            'type': orderType,
            'timeInForce': timeInForce,
            'postOnly': undefined,
            'side': side,
            'price': price,
            'stopPrice': stopPrice,
            'triggerPrice': undefined,
            'amount': amount,
            'filled': undefined,
            'cost': undefined,
            'remaining': remaining,
            'trades': undefined,
            'fee': undefined,
            'info': order,
            'average': undefined,
        }, market);
    }

    async fetchOrder (id: string, symbol: string = undefined, params = {}) {
        /**
         * @method
         * @name valr#fetchOrder
         * @description fetches information on an order made by the user
         * @param {string} symbol currency pair symbol
         * @param {object} [params] extra parameters specific to the valr api endpoint
         * @returns {object} An [order structure]{@link https://github.com/ccxt/ccxt/wiki/Manual#order-structure}
         */
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'orderId': id,
            'pair': market['id'],
        };
        const response = await this.v1PrivateGetOrdersPairOrderidOrderId (this.extend (request, params));
        return this.parseOrder (response);
    }

    // async fetchOrdersByState (state = undefined, symbol: string = undefined, since: Int = undefined, limit: Int = undefined, params = {}) {
    //     await this.loadMarkets ();
    //     const request = {};
    //     let market = undefined;
    //     if (state !== undefined) {
    //         request['state'] = state;
    //     }
    //     if (symbol !== undefined) {
    //         market = this.market (symbol);
    //         request['pair'] = market['id'];
    //     }
    //     const response = await this.privateGetListorders (this.extend (request, params));
    //     const orders = this.safeValue (response, 'orders', []);
    //     return this.parseOrders (orders, market, since, limit);
    // }

    async fetchOrders (symbol: string = undefined, since: Int = undefined, limit: Int = undefined, params = {}) {
        /**
         * @method
         * @name valr#fetchOrders
         * @description fetches information on multiple orders made by the user
         * @param {string} symbol unified market symbol of the market orders were made in
         * @param {int} [since] the earliest time in ms to fetch orders for
         * @param {int} [limit] the maximum number of order structures to retrieve
         * @param {object} [params] extra parameters specific to the valr api endpoint
         * @returns {Order[]} a list of [order structures]{@link https://github.com/ccxt/ccxt/wiki/Manual#order-structure}
         */
        const request = {};
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        const response = await this.v1PrivateGetOrdersHistory (this.extend (request, params));
        const market = this.market (symbol);
        const orders = [];
        for (let i = 0; i < response.length; i++) {
            const order = response[i];
            const pair = this.safeString (order, 'currencyPair');
            if (pair === market['id']) {
                orders.push (order);
            }
        }
        return this.parseOrders (orders);
    }

    async fetchOpenOrders (symbol: string = undefined, since: Int = undefined, limit: Int = undefined, params = {}) {
        /**
         * @method
         * @name valr#fetchOpenOrders
         * @description fetch all unfilled currently open orders
         * @param {string} symbol unified market symbol
         * @param {int} [since] the earliest time in ms to fetch open orders for
         * @param {int} [limit] the maximum number of  open orders structures to retrieve
         * @param {object} [params] extra parameters specific to the valr api endpoint
         * @returns {Order[]} a list of [order structures]{@link https://github.com/ccxt/ccxt/wiki/Manual#order-structure}
         */
        const request = {};
        const response = await this.v1PrivateGetOrdersOpen (this.extend (request, params));
        return this.parseOrders (response);
    }

    // async fetchClosedOrders (symbol: string = undefined, since: Int = undefined, limit: Int = undefined, params = {}) {
    //     /**
    //      * @method
    //      * @name valr#fetchClosedOrders
    //      * @description fetches information on multiple closed orders made by the user
    //      * @param {string} symbol unified market symbol of the market orders were made in
    //      * @param {int} [since] the earliest time in ms to fetch orders for
    //      * @param {int} [limit] the maximum number of  orde structures to retrieve
    //      * @param {object} [params] extra parameters specific to the valr api endpoint
    //      * @returns {Order[]} a list of [order structures]{@link https://github.com/ccxt/ccxt/wiki/Manual#order-structure}
    //      */
    //     return await this.fetchOrdersByState ('COMPLETE', symbol, since, limit, params);
    // }

    parseTicker (ticker, market = undefined) {
        // {
        //   "currencyPair": "BTCZAR",
        //   "askPrice": "520000",
        //   "bidPrice": "400000",
        //   "lastTradedPrice": "400000",
        //   "previousClosePrice": "400000",
        //   "baseVolume": "0",
        //   "highPrice": "400000",
        //   "lowPrice": "0",
        //   "created": "2022-06-12T18:09:05.002Z",
        //   "changeFromPrevious": "0",
        //   "markPrice": "400000"
        // }
        const created = this.safeString (ticker, 'created');
        const marketId = this.safeString (ticker, 'pair');
        const symbol = this.safeSymbol (marketId, market);
        const last = this.safeString (ticker, 'lastTradedPrice');
        const high = this.safeString (ticker, 'highPrice');
        const low = this.safeString (ticker, 'lowPrice');
        const previousClose = this.safeString (ticker, 'previousClosePrice');
        const baseVolume = this.safeString (ticker, 'baseVolume');
        const ask = this.safeString (ticker, 'askPrice');
        const bid = this.safeString (ticker, 'bidPrice');
        const change = this.safeString (ticker, 'changeFromPrevious');
        return this.safeTicker ({
            'symbol': symbol,
            'timestamp': this.parse8601 (created),
            'datetime': created,
            'high': high,
            'low': low,
            'bid': bid,
            'bidVolume': undefined,
            'ask': ask,
            'askVolume': undefined,
            'vwap': undefined,
            // is this correct?
            'open': previousClose,
            'close': undefined,
            'last': last,
            'previousClose': previousClose,
            'change': change,
            'percentage': undefined,
            'average': undefined,
            'baseVolume': baseVolume,
            'quoteVolume': undefined,
            'info': ticker,
        }, market);
    }

    async fetchTickers (symbols: string[] = undefined, params = {}) {
        /**
         * @method
         * @name valr#fetchTickers
         * @description fetches price tickers for multiple markets, statistical calculations with the information calculated over the past 24 hours each market
         * @param {string[]|undefined} symbols unified symbols of the markets to fetch the ticker for, all market tickers are returned if not assigned
         * @param {object} [params] extra parameters specific to the valr api endpoint
         * @returns {object} a dictionary of [ticker structures]{@link https://github.com/ccxt/ccxt/wiki/Manual#ticker-structure}
         */
        await this.loadMarkets ();
        symbols = this.marketSymbols (symbols);
        const response = await this.v1PublicGetPublicMarketsummary (params);
        const tickers = this.indexBy (response, 'currencyPair');
        const ids = Object.keys (tickers);
        const result = {};
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const market = this.safeMarket (id);
            const symbol = market['symbol'];
            const ticker = tickers[id];
            result[symbol] = this.parseTicker (ticker, market);
        }
        return this.filterByArray (result, 'symbol', symbols);
    }

    async fetchTicker (symbol: string, params = {}) {
        /**
         * @method
         * @name valr#fetchTicker
         * @description fetches a price ticker, a statistical calculation with the information calculated over the past 24 hours for a specific market
         * @param {string} symbol unified symbol of the market to fetch the ticker for
         * @param {object} [params] extra parameters specific to the valur api endpoint
         * @returns {object} a [ticker structure]{@link https://github.com/ccxt/ccxt/wiki/Manual#ticker-structure}
         */
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'pair': market['id'],
        };
        const response = await this.v1PublicGetPublicPairMarketsummary (this.extend (request, params));
        // {
        //     "currencyPair": "BTCZAR",
        //   "askPrice": "520000",
        //   "bidPrice": "400000",
        //   "lastTradedPrice": "400000",
        //   "previousClosePrice": "400000",
        //   "baseVolume": "0",
        //   "highPrice": "400000",
        //   "lowPrice": "0",
        //   "created": "2022-06-12T18:09:05.002Z",
        //   "changeFromPrevious": "0",
        //   "markPrice": "400000"
        // }
        return this.parseTicker (response, market);
    }

    parseTrade (trade, market = undefined) {
        // public
        // {
        //     "price": "510009",
        //     "quantity": "0.00060786",
        //     "currencyPair": "BTCZAR",
        //     "tradedAt": "2021-02-08T12:55:26.015Z",
        //     "takerSide": "buy",
        //     "sequenceId": 64139,
        //     "id": "60cfb19b-c651-42a6-a991-b99455d2b28c",
        //     "quoteVolume": "310.01407074"
        // }
        // private
        // {
        //   "price": "506500",
        //   "quantity": "0.00013693",
        //   "currencyPair": "BTCZAR",
        //   "tradedAt": "2021-02-08T11:34:42.533Z",
        //   "side": "buy",
        //   "sequenceId": 64116,
        //   "id": "eb38e549-8f61-411f-a264-65840855ed5a",
        //   "orderId": "5ff90263-71a4-4382-9d8a-7b0db9a6f5b5"
        // },
        const orderId = this.safeString (trade, 'orderId');
        const id = this.safeString (trade, 'id');
        const tradedAt = this.safeString (trade, 'tradedAt');
        const timestamp = this.parse8601 (tradedAt);
        const side = this.safeString (trade, 'side', this.safeString (trade, 'takerSide'));
        const feeCost = undefined;
        const feeCurrency = undefined;
        if ('orderId' in trade) {
            // Fee currency:
            // If you are a Maker and you are Buying BTC with ZAR, your reward will be paid in ZAR
            // If you are a Maker and you are Selling BTC for ZAR, your reward will be paid in BTC
            // If you are a Taker and you are Buying BTC with ZAR, your fee will be charged in BTC
            // If you are a Taker and you are Selling BTC for ZAR, your fee will be charged in ZAR
            // TODO: how to determine taker or maker?
        }
        return this.safeTrade ({
            'info': trade,
            'id': id,
            'timestamp': timestamp,
            'datetime': tradedAt,
            'symbol': market['symbol'],
            'order': orderId,
            'type': undefined,
            'side': side,
            // TODO: not sure here
            // 'takerOrMaker': 'taker',
            'takerOrMaker': undefined,
            'price': this.safeString (trade, 'price'),
            'amount': this.safeString (trade, 'quantity'),
            'fee': {
                'cost': feeCost,
                'currency': feeCurrency,
            },
            // can calculate fee on private trades using side
        }, market);
    }

    async fetchTrades (symbol: string, since: Int = undefined, limit: Int = undefined, params = {}) {
        /**
         * @method
         * @name valr#fetchTrades
         * @description get the list of most recent trades for a particular symbol
         * @param {string} symbol unified symbol of the market to fetch trades for
         * @param {int} [since] timestamp in ms of the earliest trade to fetch
         * @param {int} [limit] the maximum amount of trades to fetch
         * @param {object} [params] extra parameters specific to the valr api endpoint
         * @returns {Trade[]} a list of [trade structures]{@link https://github.com/ccxt/ccxt/wiki/Manual#public-trades}
         */
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'pair': market['id'],
        };
        if (since !== undefined) {
            params['startTime'] = this.iso8601 (since);
        }
        if (limit !== undefined) {
            params['limit'] = limit;
        }
        const trades = await this.v1PublicGetPublicPairTrades (this.extend (request, params));
        // [
        //     {
        //         "price": "510009",
        //         "quantity": "0.00060786",
        //         "currencyPair": "BTCZAR",
        //         "tradedAt": "2021-02-08T12:55:26.015Z",
        //         "takerSide": "buy",
        //         "sequenceId": 64139,
        //         "id": "60cfb19b-c651-42a6-a991-b99455d2b28c",
        //         "quoteVolume": "310.01407074"
        //     },
        // ]
        return this.parseTrades (trades, market, since, limit);
    }

    async fetchMyTrades (symbol: string = undefined, since: Int = undefined, limit: Int = undefined, params = {}) {
        /**
         * @method
         * @name valr#fetchMyTrades
         * @description fetch all trades made by the user
         * @param {string} symbol unified market symbol
         * @param {int} [since] the earliest time in ms to fetch trades for
         * @param {int} [limit] the maximum number of trades structures to retrieve
         * @param {object} [params] extra parameters specific to the valr api endpoint
         * @returns {Trade[]} a list of [trade structures]{@link https://github.com/ccxt/ccxt/wiki/Manual#trade-structure}
         */
        if (symbol === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchMyTrades() requires a symbol argument');
        }
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'pair': market['id'],
        };
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        const response = await this.v1PrivateGetAccountPairTradehistory (this.extend (request, params));
        // [
        //     {
        //         "price": "506500",
        //         "quantity": "0.00013693",
        //         "currencyPair": "BTCZAR",
        //         "tradedAt": "2021-02-08T11:34:42.533Z",
        //         "side": "buy",
        //         "sequenceId": 64116,
        //         "id": "eb38e549-8f61-411f-a264-65840855ed5a",
        //         "orderId": "5ff90263-71a4-4382-9d8a-7b0db9a6f5b5"
        //     },
        // ]
        return this.parseTrades (response, market, since, limit);
    }

    // async createOrder (symbol: string, type: OrderType, side: OrderSide, amount, price = undefined, params = {}) {
    //     /**
    //      * @method
    //      * @name valr#createOrder
    //      * @description create a trade order
    //      * @param {string} symbol unified symbol of the market to create an order in
    //      * @param {string} type 'market' or 'limit'
    //      * @param {string} side 'buy' or 'sell'
    //      * @param {float} amount how much of currency you want to trade in units of base currency
    //      * @param {float} [price] the price at which the order is to be fullfilled, in units of the quote currency, ignored in market orders
    //      * @param {object} [params] extra parameters specific to the valr api endpoint
    //      * @returns {object} an [order structure]{@link https://github.com/ccxt/ccxt/wiki/Manual#order-structure}
    //      */
    //     await this.loadMarkets ();
    //     let method = 'privatePost';
    //     const market = this.market (symbol);
    //     const request = {
    //         'pair': market['id'],
    //     };
    //     if (type === 'market') {
    //         method += 'Marketorder';
    //         request['type'] = side.toUpperCase ();
    //         // todo add createMarketBuyOrderRequires price logic as it is implemented in the other exchanges
    //         if (side === 'buy') {
    //             request['counter_volume'] = this.amountToPrecision (market['symbol'], amount);
    //         } else {
    //             request['base_volume'] = this.amountToPrecision (market['symbol'], amount);
    //         }
    //     } else {
    //         method += 'Postorder';
    //         request['volume'] = this.amountToPrecision (market['symbol'], amount);
    //         request['price'] = this.priceToPrecision (market['symbol'], price);
    //         request['type'] = (side === 'buy') ? 'BID' : 'ASK';
    //     }
    //     const response = await this[method] (this.extend (request, params));
    //     return this.safeOrder ({
    //         'info': response,
    //         'id': response['order_id'],
    //     }, market);
    // }
    //
    // async cancelOrder (id: string, symbol: string = undefined, params = {}) {
    //     /**
    //      * @method
    //      * @name valr#cancelOrder
    //      * @description cancels an open order
    //      * @param {string} id order id
    //      * @param {string} symbol unified symbol of the market the order was made in
    //      * @param {object} [params] extra parameters specific to the valr api endpoint
    //      * @returns {object} An [order structure]{@link https://github.com/ccxt/ccxt/wiki/Manual#order-structure}
    //      */
    //     await this.loadMarkets ();
    //     const request = {
    //         'order_id': id,
    //     };
    //     return await this.privatePostStoporder (this.extend (request, params));
    // }
    //
    // async fetchLedgerByEntries (code: string = undefined, entry = undefined, limit = undefined, params = {}) {
    //     // by default without entry number or limit number, return most recent entry
    //     if (entry === undefined) {
    //         entry = -1;
    //     }
    //     if (limit === undefined) {
    //         limit = 1;
    //     }
    //     const since = undefined;
    //     const request = {
    //         'min_row': entry,
    //         'max_row': this.sum (entry, limit),
    //     };
    //     return await this.fetchLedger (code, since, limit, this.extend (request, params));
    // }
    //
    // async fetchLedger (code: string = undefined, since: Int = undefined, limit: Int = undefined, params = {}) {
    //     /**
    //      * @method
    //      * @name valr#fetchLedger
    //      * @description fetch the history of changes, actions done by the user or operations that altered balance of the user
    //      * @param {string} code unified currency code, default is undefined
    //      * @param {int} [since] timestamp in ms of the earliest ledger entry, default is undefined
    //      * @param {int} [limit] max number of ledger entrys to return, default is undefined
    //      * @param {object} [params] extra parameters specific to the valr api endpoint
    //      * @returns {object} a [ledger structure]{@link https://github.com/ccxt/ccxt/wiki/Manual#ledger-structure}
    //      */
    //     await this.loadMarkets ();
    //     await this.loadAccounts ();
    //     let currency = undefined;
    //     let id = this.safeString (params, 'id'); // account id
    //     let min_row = this.safeValue (params, 'min_row');
    //     let max_row = this.safeValue (params, 'max_row');
    //     if (id === undefined) {
    //         if (code === undefined) {
    //             throw new ArgumentsRequired (this.id + ' fetchLedger() requires a currency code argument if no account id specified in params');
    //         }
    //         currency = this.currency (code);
    //         const accountsByCurrencyCode = this.indexBy (this.accounts, 'currency');
    //         const account = this.safeValue (accountsByCurrencyCode, code);
    //         if (account === undefined) {
    //             throw new ExchangeError (this.id + ' fetchLedger() could not find account id for ' + code);
    //         }
    //         id = account['id'];
    //     }
    //     if (min_row === undefined && max_row === undefined) {
    //         max_row = 0; // Default to most recent transactions
    //         min_row = -1000; // Maximum number of records supported
    //     } else if (min_row === undefined || max_row === undefined) {
    //         throw new ExchangeError (this.id + " fetchLedger() require both params 'max_row' and 'min_row' or neither to be defined");
    //     }
    //     if (limit !== undefined && max_row - min_row > limit) {
    //         if (max_row <= 0) {
    //             min_row = max_row - limit;
    //         } else if (min_row > 0) {
    //             max_row = min_row + limit;
    //         }
    //     }
    //     if (max_row - min_row > 1000) {
    //         throw new ExchangeError (this.id + " fetchLedger() requires the params 'max_row' - 'min_row' <= 1000");
    //     }
    //     const request = {
    //         'id': id,
    //         'min_row': min_row,
    //         'max_row': max_row,
    //     };
    //     const response = await this.privateGetAccountsIdTransactions (this.extend (params, request));
    //     const entries = this.safeValue (response, 'transactions', []);
    //     return this.parseLedger (entries, currency, since, limit);
    // }
    //
    // parseLedgerComment (comment) {
    //     const words = comment.split (' ');
    //     const types = {
    //         'Withdrawal': 'fee',
    //         'Trading': 'fee',
    //         'Payment': 'transaction',
    //         'Sent': 'transaction',
    //         'Deposit': 'transaction',
    //         'Received': 'transaction',
    //         'Released': 'released',
    //         'Reserved': 'reserved',
    //         'Sold': 'trade',
    //         'Bought': 'trade',
    //         'Failure': 'failed',
    //     };
    //     let referenceId = undefined;
    //     const firstWord = this.safeString (words, 0);
    //     const thirdWord = this.safeString (words, 2);
    //     const fourthWord = this.safeString (words, 3);
    //     let type = this.safeString (types, firstWord, undefined);
    //     if ((type === undefined) && (thirdWord === 'fee')) {
    //         type = 'fee';
    //     }
    //     if ((type === 'reserved') && (fourthWord === 'order')) {
    //         referenceId = this.safeString (words, 4);
    //     }
    //     return {
    //         'type': type,
    //         'referenceId': referenceId,
    //     };
    // }
    //
    // parseLedgerEntry (entry, currency = undefined) {
    //     // const details = this.safeValue (entry, 'details', {});
    //     const id = this.safeString (entry, 'row_index');
    //     const account_id = this.safeString (entry, 'account_id');
    //     const timestamp = this.safeInteger (entry, 'timestamp');
    //     const currencyId = this.safeString (entry, 'currency');
    //     const code = this.safeCurrencyCode (currencyId, currency);
    //     const available_delta = this.safeString (entry, 'available_delta');
    //     const balance_delta = this.safeString (entry, 'balance_delta');
    //     const after = this.safeString (entry, 'balance');
    //     const comment = this.safeString (entry, 'description');
    //     let before = after;
    //     let amount = '0.0';
    //     const result = this.parseLedgerComment (comment);
    //     const type = result['type'];
    //     const referenceId = result['referenceId'];
    //     let direction = undefined;
    //     let status = undefined;
    //     if (!Precise.stringEquals (balance_delta, '0.0')) {
    //         before = Precise.stringSub (after, balance_delta);
    //         status = 'ok';
    //         amount = Precise.stringAbs (balance_delta);
    //     } else if (Precise.stringLt (available_delta, '0.0')) {
    //         status = 'pending';
    //         amount = Precise.stringAbs (available_delta);
    //     } else if (Precise.stringGt (available_delta, '0.0')) {
    //         status = 'canceled';
    //         amount = Precise.stringAbs (available_delta);
    //     }
    //     if (Precise.stringGt (balance_delta, '0') || Precise.stringGt (available_delta, '0')) {
    //         direction = 'in';
    //     } else if (Precise.stringLt (balance_delta, '0') || Precise.stringLt (available_delta, '0')) {
    //         direction = 'out';
    //     }
    //     return {
    //         'id': id,
    //         'direction': direction,
    //         'account': account_id,
    //         'referenceId': referenceId,
    //         'referenceAccount': undefined,
    //         'type': type,
    //         'currency': code,
    //         'amount': this.parseNumber (amount),
    //         'timestamp': timestamp,
    //         'datetime': this.iso8601 (timestamp),
    //         'before': this.parseNumber (before),
    //         'after': this.parseNumber (after),
    //         'status': status,
    //         'fee': undefined,
    //         'info': entry,
    //     };
    // }

    handleErrors (httpCode, reason, url, method, headers, body, response, requestHeaders, requestBody) {
        if (response === undefined) {
            return undefined;
        }
        const error = this.safeValue (response, 'message');
        if (error !== undefined) {
            throw new ExchangeError (this.id + ' ' + this.json (response));
        }
        return undefined;
    }

    async fetchTime () {
        const response = await this.v1PublicGetPublicTime ();
        return this.parse8601 (this.safeString (response, 'time'));
    }

    async fetchStatus (params = {}) {
        const response = await this.v1PublicGetPublicStatus (params);
        const status = this.safeString (response, 'status');
        return {
            'status': status === 'online' ? 'ok' : 'maintenance',
        };
    }

    signRequest (apiSecret: string, timestamp: number, verb: string, path: string, body = '') {
        const input = timestamp + verb.toUpperCase () + path + body;
        return this.hmac (input, apiSecret, sha512);
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        const version = this.safeString (api, 0);
        const isPrivate = this.safeString (api, 1) === 'private';
        let fullPath = '/' + version + '/' + this.implodeParams (path, params);
        const query = this.omit (params, this.extractParams (path));
        if (Object.keys (query).length) {
            fullPath += '?' + this.urlencode (query);
        }
        const url = this.urls['api'] + fullPath;
        if (isPrivate) {
            this.checkRequiredCredentials ();
            const timestamp = this.now ();
            const signature = this.signRequest (this.secret, timestamp, method, fullPath, body ? JSON.stringify (body) : '');
            headers = {
                'X-VALR-API-KEY': this.apiKey,
                'X-VALR-SIGNATURE': signature,
                'X-VALR-TIMESTAMP': timestamp,
            };
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }
}
