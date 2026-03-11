const express = require("express");
const filesController = require("./controller");

const router = express.Router();

router.get("/:id", filesController.getFile);
router.get("/ping", filesController.ping);

module.exports = router;
