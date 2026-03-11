const httpStatusObj = require('http-status');
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiResponse = require('../../utils/ApiResponse');
const catchAsync = require('../../utils/catchAsync');
const logger = require('../../utils/logger').child({ context: 'Files' });

const ping = catchAsync(async (req, res) => {
  return ApiResponse(res, httpStatus.OK, 'Files module ping successful');
});

module.exports = {
  ping,
};
