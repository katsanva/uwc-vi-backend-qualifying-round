/**
 * Created by katsanva on 05.10.2014.
 */

var _ = require('underscore');

module.exports = function(req, res, next) {
    req.userIdentity = _.pick(req.cookies, 'access_token', 'account_id', 'nickname');

    // account_id is a Number
    req.userIdentity.account_id = parseInt(req.userIdentity.account_id, 10);

    next();
};
