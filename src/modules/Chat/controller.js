const httpStatusObj = require('http-status');
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiResponse = require('../../utils/ApiResponse');
const catchAsync = require('../../utils/catchAsync');
const logger = require('../../utils/logger').child({ context: 'Chat' });

const ping = catchAsync(async (req, res) => {
  return ApiResponse(res, httpStatus.OK, 'Chat module ping successful');
});

module.exports = {
  ping,
};
