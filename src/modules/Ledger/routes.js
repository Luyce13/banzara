const express = require('express');
const ledgerController = require('./controller');

const router = express.Router();

router.get('/ping', ledgerController.ping);

module.exports = router;
