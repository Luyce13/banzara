const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const createListing = {
  body: Joi.object().keys({
    title: Joi.string().required(),
    description: Joi.string(),
    category: objectId.required(),
    type: Joi.string().valid("product", "service").required(),
    price: Joi.number().min(0),
    currency: Joi.string(),
    attributes: Joi.object(),
    location: Joi.object().keys({
      type: Joi.string().valid("Point"),
      coordinates: Joi.array().items(Joi.number()).length(2),
      label: Joi.string(),
    }),
    condition: Joi.string().valid("new", "used", "refurbished"),
    status: Joi.string().valid("draft", "active"),
  }),
};

const updateListing = {
  body: Joi.object().keys({
    title: Joi.string(),
    description: Joi.string(),
    category: objectId,
    type: Joi.string().valid("product", "service"),
    price: Joi.number().min(0),
    currency: Joi.string(),
    attributes: Joi.object(),
    location: Joi.object().keys({
      type: Joi.string().valid("Point"),
      coordinates: Joi.array().items(Joi.number()).length(2),
      label: Joi.string(),
    }),
    condition: Joi.string().valid("new", "used", "refurbished"),
    status: Joi.string().valid("draft", "active", "sold"),
  }),
};

const searchListings = {
  query: Joi.object().keys({
    q: Joi.string().required().min(1),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sort: Joi.string(),
    category: objectId,
    type: Joi.string().valid("product", "service"),
  }),
};

const getNearbyListings = {
  query: Joi.object().keys({
    lng: Joi.number().required(),
    lat: Joi.number().required(),
    radius: Joi.number().min(1).max(100).default(10),
    category: objectId,
    type: Joi.string().valid("product", "service"),
  }),
};

module.exports = {
  createListing,
  updateListing,
  searchListings,
  getNearbyListings,
};
