const express = require('express');
const categoriesController = require('./controller');
const authMiddleware = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const categoryValidation = require("./validator");

const router = express.Router();

router.get("/", categoriesController.getCategoryTree);
router.get("/slug/:slug", categoriesController.getCategory);
router.get("/:id/filters", categoriesController.getCategoryFilters);

// Management (Protected)
router.post("/", authMiddleware, validate(categoryValidation.createCategory), categoriesController.createCategory);
router.patch("/:id", authMiddleware, validate(categoryValidation.updateCategory), categoriesController.updateCategory);
router.delete("/:id", authMiddleware, categoriesController.deleteCategory);

router.get('/ping', categoriesController.ping);

module.exports = router;
