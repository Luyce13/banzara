const httpStatusObj = require('http-status');
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiResponse = require('../../utils/ApiResponse');
const catchAsync = require('../../utils/catchAsync');
const logger = require('../../utils/logger').child({ context: 'Files' });
const fileService = require("./service");
const { ENV } = require("../../constants");

const getFile = catchAsync(async (req, res) => {
  const file = await fileService.getFileById(req.params.id);
  return ApiResponse(res, httpStatus.OK, "File retrieved successfully", file);
});

const ping = catchAsync(async (req, res) => {
  return ApiResponse(res, httpStatus.OK, 'Files module ping successful');
});

module.exports = {
  getFile,
  ping,
};
