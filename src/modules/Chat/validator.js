const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const getOrCreateConversation = {
  body: Joi.object().keys({
    listing: objectId.required(),
  }),
};

const sendMessage = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  body: Joi.object().keys({
    text: Joi.string().required().trim(),
  }),
};

const getMessages = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  query: Joi.object().keys({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }),
};

module.exports = {
  getOrCreateConversation,
  sendMessage,
  getMessages,
};
