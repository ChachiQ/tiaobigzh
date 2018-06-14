var express = require('express');
var config = require('../config');
var router = express.Router();
var debug = require('debug')('app.index');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendStatus(200);
});

module.exports = router;
