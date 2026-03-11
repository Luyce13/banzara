const Joi = require('joi');

const createCategory = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    slug: Joi.string(),
    parent: Joi.string().regex(/^[0-9a-fA-D]{24}$/).allow(null),
  }),
};

const updateCategory = {
  body: Joi.object().keys({
    name: Joi.string(),
    slug: Joi.string(),
    parent: Joi.string().regex(/^[0-9a-fA-D]{24}$/).allow(null),
  }),
};

module.exports = {
  createCategory,
  updateCategory,
};
