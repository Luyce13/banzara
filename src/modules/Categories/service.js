const Category = require("./model");
const ApiError = require("../../utils/ApiError");
const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;

const createCategory = async (categoryBody) => {
  if (!categoryBody.slug && categoryBody.name && categoryBody.name.en) {
    categoryBody.slug = categoryBody.name.en.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }
  return Category.create(categoryBody);
};

const getCategoryBySlug = async (slug, lang = "en") => {
  const category = await Category.findOne({ slug }).lean();
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }
  // Localize name
  category.name = category.name[lang] || category.name['en'] || Object.values(category.name)[0];
  return category;
};

const getCategoryTree = async (lang = "en") => {
  const categories = await Category.find().lean();
  
  const buildTree = (parentId = null) => {
    return categories
      .filter((cat) => String(cat.parent) === String(parentId) || (parentId === null && !cat.parent))
      .map((cat) => {
        const localizedName = cat.name[lang] || cat.name['en'] || Object.values(cat.name)[0];
        return {
          ...cat,
          name: localizedName,
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
