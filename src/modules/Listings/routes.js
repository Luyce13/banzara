const express = require('express');
const listingsController = require('./controller');

const router = express.Router();

router.get('/ping', listingsController.ping);

module.exports = router;
