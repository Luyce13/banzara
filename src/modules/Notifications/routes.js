const express = require('express');
const notificationsController = require('./controller');

const router = express.Router();

router.get('/ping', notificationsController.ping);

module.exports = router;
