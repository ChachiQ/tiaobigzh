var express = require('express');
var router = express.Router();
var debug = require('debug')('app.index');
var path = require('path');

/* GET home page. */
router.get('/', function(_, res) {
  console.log('12sdfasdf')
  res.render('index');
});

module.exports = router;
