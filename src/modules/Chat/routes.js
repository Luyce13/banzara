const express = require('express');
const chatController = require('./controller');

const router = express.Router();

router.get('/ping', chatController.ping);

module.exports = router;
