/**
 * Created by katsanva on 01.10.2014.
 */

'use strict';

var express = require('express'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    path = require('path'),
    mc = require('mc'),
    config = require('./config.json'),
    identity = require('./lib/identity'),
    client = new mc.Client(),
    router = require('./lib/router')(client);

var app = express();

app.use(cookieParser())
    .use(bodyParser.json())
    .use(identity)
    .use(express.static(path.join(__dirname, '/public')))
    .use(router);

app.set('port', process.env.PORT || config.port || 3001);

client.connect(function() {
    console.log('Connected to the localhost memcache on port 11211');

    var server = app.listen(app.get('port'), function() {
        console.log('Express server listening on port ' + server.address().port);
    });
});