module.exports = (io) => {
    io.on('connection', (socket) => { // 웹소켓 연결 시
        console.log('Socket initiated!');

        socket.on('call', (data) => {
            console.log('Socket: btnClicked');
            updateData(memoize);
        });

    });

    function updateData(data) {
        if (io) {
            io.emit("data", data);
        }
    }

    //requires
    var request = require('request');
    var _ = require('lodash');
    //values
    var intervalCounter = 0;
    var exchanges = {
        bitthumb: {
            url: "https://api.bithumb.com/public/ticker/all",
            tick: 3
        },
        coinone: {
            url: "https://api.coinone.co.kr/ticker?currency=all",
            tick: 6
        },
        bittrex: {
            url: "https://bittrex.com/api/v1.1/public/getmarketsummaries",
            tick: 9
        },
        binance: {
            url: "https://api.binance.com/api/v1/ticker/24hr",
            tick: 12
        },
    };
    var urls2 = {
        // bitfinex: {
        //   symbols: "https://api.bitfinex.com/v1/symbols",
        //   tickers: "https://api.bitfinex.com/v2/tickers?symbols=ç"
        // }
    };
    var ignoreProps = {
        coinone: ["errorCode", "result", "timestamp"],
        bitthumb: ["date"],
        binance: ["456"]
    };
    var currencyUrls = {
        yahoo: "https://finance.yahoo.com/webservice/v1/symbols/allcurrencies/quote?format=json",
    };
    var constant = {
        day: 60 * 60 * 24,
        tick: 3
    };
    var bases = {
        krw: "KRW",
        jpy: "JPY",
        usd: "USD",
        btc: "BTC",
    };
    var baseValues = {
        qoute: { name: bases.krw, rate: 0 },
        currency: { name: bases.btc, rate: 0 }
    };
    var memoize = [
        {
            max: 20,
            time: 3,
            list: [],
            type: "sec"
        },
        {
            max: 60,
            time: 60,
            list: [],
            type: "min"
        },
        {
            max: 24,
            time: 60 * 60,
            list: [],
            type: "hour"
        },
        {
            max: 30,
            time: 60 * 60 * 24,
            list: [],
            type: "day"
        },
    ];
    var qoutes = null;

    var tickerArray = [];
    var tickerVO = {
        first: null,
        last: null,
        high: null,
        low: null,
        volume: null,
        currency: null,
        exchange: null,
        market: null,
        custom: {},
        timestamp: null
    };
    var marketVO = {
        currency: null,
        base: null,
        currencyName: null,
        baseName: null,
        transUnit: null,
        isActive: null,
        exchange: null,
        market: null,
        custom: {}
    };
    var marketUrls = {
        bittrex: "https://bittrex.com/api/v1.1/public/getmarkets"
    };
    //functions
    function callCurrency(callback) {
        var resultArr = [];
        var keys = _.keys(currencyUrls);
        var cnt = 0;
        for (let i = 0, len = keys.length; i < len; i++) {
            requestCurrency(currencyUrls[keys[i]], keys[i], function (data) {
                resultArr = resultArr.concat(data);
                cnt++;
                console.log(cnt);
                if (cnt === keys.length) {
                    callback(resultArr);
                }
            });
        }
    }
    function requestCurrency(url, source, callback) {
        var list = null;
        console.log(source);
        request({
            url: url,
            json: true
        }, function (error, response, body) {
            if (source == "tether") console.log(response.statusCode)
            if (error) {
                console.log(error);
            } else if (!error && response.statusCode === 200) {
                var data;
                switch (source) {
                    case "yahoo":
                        data = body.list.resources;
                        list = _(data).map(function (value) {
                            var resource = value && value.resource && value.resource.fields;
                            var qouteName = resource.name.split("/")[1];
                            if (qouteName && qouteName.length > 0) {
                                resource.name = qouteName;
                                return resource;
                            } else {
                                return null;
                            }
                        }).compact().value();
                        break;
                    case "tether":
                        console.log(body);
                        data = body;
                        list = _(data).map(function (value) {
                            if (value.source_currency.indexOf(bases.usd) > 0) {
                                value.name = bases.btc;
                                value.price = value.exchange_rate;
                                return value;
                            } else {
                                return null;
                            }
                        }).compact().value();
                        break;
                }
                if (callback) {
                    callback(list);
                }
            }
        });
    }
    function callAllTicker(callback, counter) {
        // var resultArr = [];
        var keys = _.keys(exchanges);
        var keys_len = keys.length;
        //다른 타입
        var keys2 = _.keys(urls2);
        var keys2_len = keys2.length;

        var total = keys_len + keys2_len;
        var resultObj = {};

        var cnt = 0;
        for (let i = 0, len = keys_len; i < len; i++) {
            var key = keys[i];
            if (counter === undefined) {
                requestTicker(exchanges[key].url, key, function (data) {
                    // resultArr = resultArr.concat(data);
                    resultObj = _.extend(resultObj, data);

                    cnt++;
                    if (cnt === total) {
                        callback(resultObj);
                    }
                });
            } else {
                if (counter % exchanges[key].tick === 0) {
                    console.log(key, counter, exchanges[key].tick);
                    requestTicker(exchanges[key].url, key, function (data) {
                        // resultArr = resultArr.concat(data);
                        resultObj = _.extend(resultObj, data);
                        cnt++;
                        if (cnt === total) {
                            callback(resultObj);
                        }
                    });
                } else {
                    total--;
                }
            }
        }

        for (let j = 0, jLen = keys2_len; j < jLen; j++) {
            requestTicker2(urls2[keys2[j]], keys2[j], function (data) {
                resultObj = _.extend(resultObj, data);
                // resultArr = resultArr.concat(data);
                console.log(keys2[i]);
                cnt++;
                if (cnt === total) {
                    callback(resultObj);
                }
            })
        }
    }
    //bitfinex
    function requestTicker2(urlObj, exchange, callback) {
        var list = null;
        request({
            url: urlObj.symbols,
            json: true
        }, function (error, response, body) {
            if (error) {
                console.log(error);
            } else if (!error && response.statusCode === 200) {
                var symbols = body;
                var param = _.map(symbols, function (even, idx, collection) {
                    return "t" + even.toUpperCase()
                }).toString();
                request({
                    url: urlObj.tickers + param,
                    json: true
                }, function (error, response, body) {
                    if (error) {
                        console.log(error);
                    } else if (!error && response.statusCode === 200) {
                        var tickers = body;
                        list = _(tickers).map(function (value) {
                            return value ? tickerAdaptor(value, exchange) : null;
                        }).value();
                        if (callback) {
                            callback(list);
                        }
                    }
                });
            }
        })
    }
    function requestTicker(url, exchange, callback) {
        request({
            url: url,
            json: true
        }, function (error, response, body) {
            if (error) {
                console.log(error);
            } else if (!error && response.statusCode === 200) {
                var data;
                switch (exchange) {
                    case "bitthumb":
                        data = body.data;
                        break;
                    case "bittrex":
                        data = body.result;
                        break;
                    default:
                        data = body;
                        break;
                }
                var ignoreProp = ignoreProps[exchange];
                if (ignoreProp) {
                    for (var i = 0, len = ignoreProp.length; i < len; i++) {
                        delete data[ignoreProp[i]];
                    }
                }
                // var list = null;
                var obj = {};
                //array type
                if (_.isArray(data)) {
                    _.forEach(data, function (value) {
                        var even = null;
                        if (value) {
                            even = tickerAdaptor(value, exchange);
                        }
                        if (even) {
                            obj[even.market + "-" + exchange] = even;
                        }
                    });
                    // list = _(data).map(function (value) {
                    //     return value ? tickerAdaptor(value, exchange) : null;
                    // }).value();
                    //object type
                } else if (_.isObject(data)) {
                    var timestamp = data.timestamp || data.date;
                    var even = null;
                    _.forEach(data, function (value, key) {
                        if (ignoreProps[exchange].indexOf(key) > 0) {
                            return;
                        }
                        even = tickerAdaptor(_.merge({
                            currency: key.toUpperCase(),
                            timestamp: timestamp
                        }, value), exchange);
                        if (even) {
                            obj[even.market + "-" + exchange] = even;
                        }
                    });
                    // list = _(data).mapValues(function (value, id) {
                    //     var obj = {
                    //         currency: id.toUpperCase(),
                    //         timestamp: timestamp
                    //     }
                    //     return _.isObject(value) ? _.merge(obj, value) : null;
                    // }).values().compact().map(function (value) {
                    //     return value ? tickerAdaptor(value, exchange) : null;
                    // }).value();
                }
                if (callback) {
                    callback(obj);
                }
            }
        });
    }
    function memoizeList(list, tick) {
        var now = list;
        var past = null;

        for (let i = 0, len = memoize.length; i < len; i++) {
            var value = memoize[i];
            if (tick % value.time === 0) {
                if (value.list.length >= value.max) {
                    value.list.shift();
                }
                if (i > 0) {
                    var obj = {}
                    past = memoize[i - 1].list;
                    var keys = [];
                    _.forEach(past, function (value) {
                        keys = keys.concat(_.keys(value));
                    });
                    keys = _.uniq(keys);

                    _.forEach(keys, function (key) {
                        var arr = [];
                        _.forEach(past, function (value) {
                            if (value[key]) {
                                arr.push(value[key]);
                            }
                        });
                        var first = _.minBy(arr, "volume");
                        var last = _.maxBy(arr, "volume");
                        var even = {
                            high: _.maxBy(arr, "high").high,
                            low: _.minBy(arr, "low").low,
                            first: first.first,
                            last: last.last,
                            volume: last.volume,
                            volumeIncrease: last.volume / first.volume - 1,
                            custom: last.custom
                        };
                        obj[key] = even;
                    });
                    value.list.push(obj);
                } else {
                    value.list.push(now);
                }


                console.log(value.type + " : " + value.list.length);
            }
            if (tick === constant.day) {
                tick = 0;
            }
        }
        return past;
    }
    function callMarket(callback) {
        var resultArr = [];
        var keys = _.keys(marketUrls);
        var cnt = 0;
        for (let i = 0, len = keys.length; i < len; i++) {
            requestMarket(marketUrls[keys[i]], keys[i], function (data) {
                resultArr = resultArr.concat(data);
                cnt++;
                if (cnt === keys.length) {
                    callback(resultArr);
                }
            });
        }
    }
    function requestMarket(url, exchange, callback) {
        request({
            url: url,
            json: true
        }, function (error, response, body) {
            if (error) {
                console.log(error);
            } else if (!error && response.statusCode === 200) {
                var data;
                switch (exchange) {
                    case "bittrex":
                        data = body.result;
                        break;
                    default:
                        data = body;
                        break;
                }
                var list = _(data).map(function (value) {
                    return value ? marketAdaptor(value, exchange) : null;
                }).compact().value();

                if (callback) {
                    callback(list);
                }
            }
        });
    }
    function marketAdaptor(data, exchange) {
        var obj = _.cloneDeep(marketVO);
        obj.exchange = exchange;
        switch (exchange) {
            case "bittrex":
                obj.currency = data.MarketCurrency;
                obj.base = data.BaseCurrency;
                obj.currencyName = data.MarketCurrencyLong;
                obj.baseName = data.BaseCurrencyLong;
                obj.transUnit = data.MinTradeSize;
                obj.isActive = data.isActive;
                obj.market = data.MarketName;
                obj.custom.created = data.Created;
                break;
        }
        return obj;
    }

    function currencyAdaptor(data) {
        return
    }
    function tickerAdaptor(data, exchange) {
        var obj = _.cloneDeep(tickerVO);
        obj.exchange = exchange;
        obj.timestamp = data.timestamp || data.TimeStamp;
        // 한국코인
        if (data.currency) {
            obj.currency = data.currency.toUpperCase();
            obj.base = bases.krw;
            obj.market = obj.base + "-" + obj.currency;
        } else {
            if (exchange === "bittrex") {
                obj.market = data.MarketName;
                var arr = obj.market.split("-");
                obj.currency = arr[1];
                obj.base = arr[0];
            } else if (exchange === "binance") {
                var symbol = data.symbol;
                obj.base = data.symbol.substring(symbol.length - 3);
                if (obj.base === "SDT") {
                    obj.base = data.symbol.substring(symbol.length - 4);
                    obj.currency = data.symbol.substring(0, symbol.length - 4);
                } else {
                    obj.currency = data.symbol.substring(0, symbol.length - 3);
                }
                obj.market = obj.base + "-" + obj.currency;
            }
        }
        switch (exchange) {
            case "bitthumb":
                obj.first = +data.opening_price;
                obj.last = +data.closing_price;
                obj.high = +data.max_price;
                obj.low = +data.min_price;
                obj.volume = +data.units_traded;
                obj.custom.avg = +data.average_price;
                obj.custom.volume_1 = +data.volume_1day;
                obj.custom.volume_7 = +data.volume_7day;
                obj.custom.ask = +data.buy_price;
                obj.custom.bid = +data.sell_price;
                break;
            case "coinone":
                obj.first = +data.first;
                obj.last = +data.last;
                obj.high = +data.high;
                obj.low = +data.low;
                obj.volume = +data.volume;
                obj.custom.yesterday_first = +data.yesterday_first;
                obj.custom.yesterday_last = +data.yesterday_last;
                obj.custom.yesterday_high = +data.yesterday_high;
                obj.custom.yesterday_low = +data.yesterday_low;
                break;
            case "bittrex":
                obj.first = data.PrevDay;
                obj.last = data.Last;
                obj.high = data.High;
                obj.low = data.Low;
                obj.volume = data.Volume;
                obj.custom.base_volume = data.BaseVolume;
                obj.custom.ask = data.Ask;
                obj.custom.bid = data.Bid;
                obj.custom.sell_orders = data.OpenSellOrders;
                obj.custom.buy_orders = data.OpenBuyOrders;
                break;
            case "binance":
                obj.first = +data.openPrice;
                obj.last = +data.lastPrice;
                obj.high = +data.highPrice;
                obj.low = +data.lowPrice;
                obj.volume = +data.volume;
                obj.custom.price_change = +data.priceChange;
                obj.custom.price_change_percent = +data.priceChangePercent;
                obj.custom.base_volume = +data.quoteVolume;
                obj.custom.last_qty = +data.lastQty;
                obj.custom.ask = +data.askPrice;
                obj.custom.ask_qty = +data.askQty;
                obj.custom.bid = +data.bidPrice;
                obj.custom.bid_qty = +data.bidQty;
                obj.custom.avg = +data.weightedAvgPrice;
                obj.custom.yesterday_last = +data.prevClosePrice;
                obj.custom.trade_count = +data.count;
                break;
            case "bitfinex":
                obj.first = +parseFloat(data[7] - data[5]).toFixed(8);
                obj.last = data[7];
                obj.high = data[9];
                obj.low = data[10];
                obj.volume = data[8];
                obj.custom.price_change = data[5];
                obj.custom.price_change_percent = data[6];
                obj.custom.ask = data[3];
                obj.custom.ask_qty = data[4];
                obj.custom.bid = data[1];
                obj.custom.bid_qty = data[2];
                var symbol = data[0].substring(1);
                obj.base = symbol.substring(symbol.length - 3);
                obj.currency = symbol.substring(0, symbol.length - 3);
                obj.market = obj.base + "-" + obj.currency;
                break;
        }
        return obj;
    }

    //exec
    init();
    function init() {
        //환율 조회
        callCurrency(function (data) {
            if (data.length > 0) {
                qoutes = data;
            }
            console.log(data);
            var tempObj = _(qoutes).filter(function (data) {
                return data.name === baseValues.qoute.name;
            }).value();

            if (tempObj && tempObj.length > 0) {
                baseValues.qoute.rate = tempObj[0].price;
            }

            tempObj = _(qoutes).filter(function (data) {
                return data.name === baseValues.currency.name;
            }).value();
            if (tempObj && tempObj.length > 0) {
                baseValues.currency.rate = tempObj[0].exchange_rate;
            }
            console.log(baseValues);
        });

        setInterval(function () {
            intervalCounter += constant.tick;
            callAllTicker(function (data) {
                console.log("memoize at : " + intervalCounter);
                memoizeList(data, intervalCounter);
                // updateData(memoize);
            }, intervalCounter);
        }, constant.tick * 1000);
    }
};