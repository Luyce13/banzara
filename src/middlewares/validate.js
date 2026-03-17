const Joi = require('joi');
const httpStatusObj = require('http-status');
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiError = require('../utils/ApiError');

const validate = (schema) => (req, res, next) => {
  const validSchema = Object.keys(schema).reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(schema, key)) {
      acc[key] = schema[key];
    }
    return acc;
  }, {});
  const object = Object.keys(validSchema).reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(req, key)) {
      let value = req[key];
      
      // If it's an object (like req.body), try to parse its fields if they are JSON strings
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        value = Object.keys(value).reduce((fieldAcc, fieldKey) => {
          let fieldValue = value[fieldKey];
          if (typeof fieldValue === 'string' && (fieldValue.startsWith('{') || fieldValue.startsWith('['))) {
            try {
              fieldValue = JSON.parse(fieldValue);
            } catch (e) {
              // Ignore parsing errors
            }
          }
          fieldAcc[fieldKey] = fieldValue;
          return fieldAcc;
        }, {});
      }
      
      acc[key] = value;
    }
    return acc;
  }, {});
  
  const { value, error } = Joi.compile(validSchema)
    .prefs({ errors: { label: 'key' }, abortEarly: false })
    .validate(object);

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
  }
  Object.assign(req, value);
  return next();
};

module.exports = validate;
