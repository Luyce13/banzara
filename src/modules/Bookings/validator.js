const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const createBooking = {
  body: Joi.object().keys({
    listing: objectId.required(),
    note: Joi.string().allow(""),
    scheduledAt: Joi.date(),
  }),
};

const updateBookingStatus = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  body: Joi.object().keys({
    status: Joi.string()
      .valid("confirmed", "completed", "cancelled")
      .required(),
  }),
};

const getMyBookings = {
  query: Joi.object().keys({
    role: Joi.string().valid("buyer", "seller"),
    status: Joi.string().valid("pending", "confirmed", "completed", "cancelled"),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sort: Joi.string(),
  }),
};

module.exports = {
  createBooking,
  updateBookingStatus,
  getMyBookings,
};
