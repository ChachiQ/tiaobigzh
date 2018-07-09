var express = require('express');
var router = express.Router();
var debug = require('debug')('app.index');
var path = require('path');

/* GET home page. */
router.get('/', function(_, res) {
  try {
    res.render('index');
  } catch (err) {
    console.log(err);
    throw err;
  }
});

module.exports = router;
