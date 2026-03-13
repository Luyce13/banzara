const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const createReview = {
  body: Joi.object().keys({
    booking: objectId.required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().allow(""),
  }),
};

const getReviews = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sort: Joi.string(),
  }),
};

module.exports = {
  createReview,
  getReviews,
};
