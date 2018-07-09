var express = require('express');
var router = express.Router();

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
