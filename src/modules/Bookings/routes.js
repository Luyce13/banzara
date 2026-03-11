const express = require('express');
const bookingsController = require('./controller');

const router = express.Router();

router.get('/ping', bookingsController.ping);

module.exports = router;
