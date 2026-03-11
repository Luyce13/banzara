const httpStatusObj = require('http-status');
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiResponse = require('../../utils/ApiResponse');
const catchAsync = require('../../utils/catchAsync');
const logger = require('../../utils/logger').child({ context: 'Reviews' });

const ping = catchAsync(async (req, res) => {
  return ApiResponse(res, httpStatus.OK, 'Reviews module ping successful');
});

module.exports = {
  ping,
};
