const Joi = require('joi');

const createCategory = {
  body: Joi.object().keys({
    name: Joi.object().keys({
      en: Joi.string().required(),
      tr: Joi.string().required(),
      ar: Joi.string().required(),
    }).required(),
    slug: Joi.string(),
    parent: Joi.string().regex(/^[0-9a-fA-D]{24}$/).allow(null),
    attributeSchema: Joi.array(),
  }),
};

const updateCategory = {
  body: Joi.object().keys({
    name: Joi.object().keys({
      en: Joi.string(),
      tr: Joi.string(),
      ar: Joi.string(),
    }),
    slug: Joi.string(),
    parent: Joi.string().regex(/^[0-9a-fA-D]{24}$/).allow(null),
    attributeSchema: Joi.array(),
  }),
};

module.exports = {
  createCategory,
  updateCategory,
};
