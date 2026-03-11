const express = require("express");
const usersController = require("./controller");

const router = express.Router();

router.get("/ping", usersController.ping);

module.exports = router;
