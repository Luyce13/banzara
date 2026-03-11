const ApiError = require("../utils/ApiError");
const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const logger = require("../utils/logger").child({ context: "ErrMidl" });
const { ENV } = require("../constants");

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode ||
      (error instanceof require("mongoose").Error
        ? httpStatus.BAD_REQUEST
        : httpStatus.INTERNAL_SERVER_ERROR);
    const message = error.message || httpStatus[statusCode];
    error = new ApiError(statusCode, message, false, err.stack);
  }

  // Log error with stack trace
  logger.error(error);

  const response = {
    success: error.success,
    message: error.message,
    ...(ENV.NODE_ENV === "development" && { stack: error.stack }),
  };

  res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
