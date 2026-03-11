const ApiResponse = (res, statusCode, message = 'Success', data = {}) => {
  const success = statusCode < 400;
  return res.status(statusCode).json({
    success,
    message,
    data,
  });
};

module.exports = ApiResponse;

