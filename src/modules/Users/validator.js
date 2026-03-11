const Joi = require("joi");

const updateProfile = {
  body: Joi.object().keys({
    name: Joi.string(),
    email: Joi.string().email(),
    avatar: Joi.string().regex(/^[0-9a-fA-D]{24}$/), // ObjectId
    address: Joi.object().keys({
      type: Joi.string().valid("Point"),
      coordinates: Joi.array().items(Joi.number()).length(2),
      label: Joi.string(),
    }),
  }),
};

module.exports = {
  updateProfile,
};
