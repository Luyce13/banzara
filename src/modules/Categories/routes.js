const express = require('express');
const categoriesController = require('./controller');

const router = express.Router();

router.get('/ping', categoriesController.ping);

module.exports = router;
