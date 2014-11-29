/**
 * Created by katsanva on 05.10.2014.
 */

var express = require('express'),
    async = require('async'),
    _ = require('underscore'),
    url = require('url'),
    api = require('./api'),
    config = require(__dirname + '/../config.json'),
    router = new express.Router(),
    WOTLoginURL = url.format({
        protocol: 'https',
        host: 'api.worldoftanks.ru',
        pathname: '/wot/auth/login/',
        query: {
            application_id: config.application_id,
            redirect_uri: url.format(
                {
                    protocol: 'http',
                    hostname: 'localhost',
                    port: process.env.PORT || config.port || 3001,
                    pathname: '/login'
                }
            )
        }
    }),
    client;


module.exports = function(memcacheClient) {
    client = memcacheClient;

    return router;
};

router.get('/auth', function(req, res) {
    // let rhe WOT auth the user
    res.redirect(WOTLoginURL);
});

router.get('/login', function(req, res) {
    // no time to invent something powerful
    if (typeof req.query.status === 'string') {
        if (req.query.status === 'ok') {
            var expires = new Date(parseInt(req.query.expires_at, 10) * 1000);

            res.cookie('access_token', req.query.access_token, {expires: expires});
            res.cookie('nickname', req.query.nickname, {expires: expires});
            res.cookie('account_id', req.query.account_id, {expires: expires});
        }
    }

    res.redirect('/');
    res.end();
});

router.post('/neighbours', function(req, res) {
    if (!req.userIdentity.account_id) {
        // sorry
        return res.status(401).end();
    }

    var key = 'userData__' + req.userIdentity.account_id;

    // first check in memcache
    client.get(key, function(err, response) {
            /*
             This functions are dependent from req, res and key variables,
             so we can't move them out.
             */
            var getNeighbours = function(callback) {
                    console.log('get neighbours');

                    api.getNeighbours(req.userIdentity.account_id, callback);
                },
                getNeighboursInfo = function(response, body, callback) {
                    if (body.status === 'error') {
                        return callback(body.error, null);
                    }

                    var responseData = {
                            users: {},
                            tanks: []
                        },
                        getNeighbourInfo = function(neighbour, cb) {
                            if (neighbour.account_id === req.userIdentity.account_id) {
                                // exclude logged user
                                return cb();
                            }

                            var getUserAccount = function(callback) {
                                    /*
                                     Yes, it is possible to get all the userAccounts in one call.
                                     But I'll make this in @1.0.1.
                                     */
                                    api.getUserAccount(neighbour.account_id, callback);
                                },
                                getTanksStats = function(response, body, callback) {
                                    if (body.status === 'error') {
                                        return callback(body.error);
                                    }
                                    // save user's stats
                                    neighbour = _.extend(neighbour, body.data[neighbour.account_id]);
                                    // get tank's stats
                                    api.getTanksStats(neighbour.account_id, callback);
                                },
                                mergeData = function(response, body, callback) {
                                    if (body.status === 'error') {
                                        return cb(body.error);
                                    }

                                    neighbour.tanks = {};
                                    neighbour.wins_count = Math.round(
                                        neighbour.battles_count.value * neighbour.wins_ratio.value / 100
                                    );

                                    _.each(body.data[neighbour.account_id], function(tank) {
                                        neighbour.tanks[tank.tank_id] = tank;
                                    });

                                    responseData.users[neighbour.account_id] = neighbour;
                                    responseData.tanks = _.union(responseData.tanks, Object.keys(neighbour.tanks));

                                    callback(null, responseData);
                                };

                            async.waterfall([
                                getUserAccount,
                                getTanksStats,
                                mergeData
                            ], cb);
                        },
                        returnData = function(err) {
                            console.log('processed neighbours');

                            callback(err, responseData);
                        };

                    async.eachSeries(
                        body.data,
                        getNeighbourInfo,
                        returnData
                    );
                },
                cacheNeighboursData = function(responseData, callback) {
                    // 1 hour
                    client.set(key, JSON.stringify(responseData), {exptime: 3600}, function(error) {
                        console.log('saved', key);

                        callback(error, responseData);
                    });
                },
                getTanksInfo = function(responseData, callback) {
                    var notResolvedTanks = [],
                        resolvedTanks = {},
                        filterMissingTanks = function(tank, cb) {
                            var key = 'tankInfo__' + tank;

                            client.get(key, function(err, result) {
                                if (err) {
                                    notResolvedTanks.push(tank);

                                    return cb();
                                }

                                resolvedTanks[tank] = JSON.parse(result[key]);

                                cb();
                            });
                        }
                        ;

                    async.eachSeries(
                        responseData.tanks,
                        filterMissingTanks,
                        function(err) {
                            if (notResolvedTanks.length) {
                                var getTanksInfo = function(callback) {
                                        api.getTanksInfo(notResolvedTanks.join(','), callback);
                                    },
                                    saveTanksInfo = function(response, body, callback) {
                                        if (body.status === 'error') {
                                            return callback(body.error);
                                        }

                                        var tankArray = Object.keys(body.data).map(function(k) {
                                                return body.data[k];
                                            }),
                                            saveOne = function(tank, cb) {
                                                var key = 'tankInfo__' + tank.tank_id;

                                                client.set(key, JSON.stringify(tank), {exptime: 2419200},
                                                    function(err) {
                                                        if (err) {
                                                            return cb(err);
                                                        }

                                                        resolvedTanks[tank.tank_id] = tank;
                                                        cb();
                                                    });
                                            };

                                        async.eachSeries(
                                            tankArray,
                                            saveOne,
                                            callback);
                                    },
                                    pushTanksData = function(callback) {
                                        responseData.tanks = resolvedTanks;

                                        callback(err, responseData);
                                    };

                                console.log('getting tank info from WOT API', notResolvedTanks.length);

                                return async.waterfall(
                                    [
                                        getTanksInfo,
                                        saveTanksInfo,
                                        pushTanksData
                                    ],
                                    callback
                                );


                            }

                            console.log('Everything cached');

                            responseData.tanks = resolvedTanks;

                            callback(err, responseData);
                        });


                },
                sendResponse = function(err, result) {
                    if (err) {
                        return res.status(err.code || 500).json(err).end();
                    }

                    res.json(result).end();
                };

            if (!err && response[key]) {
                // get tanks info and send response
                console.log('exist', key);
                return getTanksInfo(JSON.parse(response[key]), sendResponse);
            }

            // get all the info from
            return async.waterfall([
                    getNeighbours,
                    getNeighboursInfo,
                    cacheNeighboursData,
                    getTanksInfo
                ], sendResponse
            );
        }
    );
});
