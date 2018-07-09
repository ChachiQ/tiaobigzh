var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(_, res) {
  console.log('asfasdf');
  res.render('index');
});

module.exports = router;
