const Category = require("./model");
const ApiError = require("../../utils/ApiError");
const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;

const createCategory = async (categoryBody) => {
  if (!categoryBody.slug && categoryBody.name) {
    categoryBody.slug = categoryBody.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }
  return Category.create(categoryBody);
};

const getCategoryBySlug = async (slug) => {
  const category = await Category.findOne({ slug }).lean();
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }
  return category;
};

const getCategoryTree = async () => {
  const categories = await Category.find().lean();
  
  const buildTree = (parentId = null) => {
    return categories
      .filter((cat) => String(cat.parent) === String(parentId) || (parentId === null && !cat.parent))
      .map((cat) => {
        return {
          ...cat,
          children: buildTree(cat._id),
        };
      });
  };

  return buildTree();
};

const updateCategoryById = async (id, updateBody) => {
  const category = await Category.findById(id);
  if (!category) {
     throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }
  Object.assign(category, updateBody);
  await category.save();
  return category;
};

const deleteCategoryById = async (id) => {
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }
  await category.deleteOne();
  return category;
};

const getCategoryFilters = async (id) => {
  const category = await Category.findById(id).lean();
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }
  return (category.attributeSchema || []).filter((attr) => attr.filterable);
};

module.exports = {
  createCategory,
  getCategoryBySlug,
  getCategoryTree,
  getCategoryFilters,
  updateCategoryById,
  deleteCategoryById,
};
