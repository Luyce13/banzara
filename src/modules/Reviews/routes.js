const express = require('express');
const reviewsController = require('./controller');

const router = express.Router();

router.get('/ping', reviewsController.ping);

module.exports = router;
