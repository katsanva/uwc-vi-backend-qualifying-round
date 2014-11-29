/**
 * Created by katsanva on 05.10.2014.
 */

var request = require('request'),
    _ = require('underscore'),
    config = require(__dirname + '/../config.json');

if (!config.application_id) {
    throw new Error('No application ID given');
}

function helper(path, params, callback) {
    var options = {
        method: 'POST',
        json: true,
        url: 'https://api.worldoftanks.ru/wot/' + path + '/',
        form: {
            application_id: config.application_id
        }
    };

    options.form = _.extend(options.form, params);

    request(options, callback);
}

module.exports = {
    getNeighbours: function(accountId, callback) {
        helper(
            'ratings/neighbors',
            {
                type: '28',
                fields: 'account_id,battles_count.value,wins_ratio.value',
                account_id: accountId,
                limit: 10,
                rank_field: 'frags_count'
            },
            callback
        );
    },
    getUserAccount: function(accountId, callback) {
        helper(
            'ratings/accounts',
            {
                fields: 'battles_count.value,wins_ratio.value',
                type: 'all',
                account_id: accountId
            },
            callback
        );
    },
    getTanksStats: function(accountId, callback) {
        helper(
            'tanks/stats',
            {
                fields: 'all.battles,all.wins,tank_id',
                account_id: accountId
            },
            callback
        );
    },
    getTanksInfo: function(tankId, callback) {
        helper(
            'encyclopedia/tankinfo',
            {
                fields: 'localized_name,tank_id',
                tank_id: tankId
            },
            callback
        );
    }
};
