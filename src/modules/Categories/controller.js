const httpStatusObj = require('http-status');
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiResponse = require('../../utils/ApiResponse');
const catchAsync = require('../../utils/catchAsync');
const logger = require('../../utils/logger').child({ context: 'Categories' });
const categoryService = require("./service");

const createCategory = catchAsync(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  return ApiResponse(res, httpStatus.CREATED, "Category created successfully", category);
});

const getCategoryTree = catchAsync(async (req, res) => {
  const lang = req.headers['accept-language'] || 'en';
  const tree = await categoryService.getCategoryTree(lang);
  return ApiResponse(res, httpStatus.OK, "Category tree retrieved", tree);
});

const getCategory = catchAsync(async (req, res) => {
  const lang = req.headers['accept-language'] || 'en';
  const category = await categoryService.getCategoryBySlug(req.params.slug, lang);
  return ApiResponse(res, httpStatus.OK, "Category retrieved", category);
});

const updateCategory = catchAsync(async (req, res) => {
  const category = await categoryService.updateCategoryById(req.params.id, req.body);
  return ApiResponse(res, httpStatus.OK, "Category updated", category);
});

const deleteCategory = catchAsync(async (req, res) => {
  await categoryService.deleteCategoryById(req.params.id);
  return ApiResponse(res, httpStatus.OK, "Category deleted");
});

const getCategoryFilters = catchAsync(async (req, res) => {
  const filters = await categoryService.getCategoryFilters(req.params.id);
  return ApiResponse(res, httpStatus.OK, "Category filters retrieved", filters);
});

const ping = catchAsync(async (req, res) => {
  return ApiResponse(res, httpStatus.OK, 'Categories module ping successful');
});

module.exports = {
  createCategory,
  getCategoryTree,
  getCategory,
  updateCategory,
  deleteCategory,
  getCategoryFilters,
  ping,
};
