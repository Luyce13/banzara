const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiResponse = require("../../utils/ApiResponse");
const catchAsync = require("../../utils/catchAsync");
const logger = require("../../utils/logger").child({ context: "Users" });

const userService = require("./service");

const ping = catchAsync(async (req, res) => {
  return ApiResponse(res, httpStatus.OK, "Users module ping successful");
});

const fileService = require("../Files/service");

const getMe = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  return ApiResponse(res, httpStatus.OK, "User profile retrieved", user);
});

const updateMe = catchAsync(async (req, res) => {
  let fileDoc;

  if (req.file) {
    fileDoc = await fileService.getOrCreateFile(req.file, "avatars");
    req.body.avatar = fileDoc._id;
  }

  try {
    const user = await userService.updateUserById(req.user.id, req.body);
    return ApiResponse(res, httpStatus.OK, "User profile updated", user);
  } catch (error) {
    if (fileDoc) {
      await fileService.decrementRefCount(fileDoc._id);
    }
    throw error;
  }
});

module.exports = {
  ping,
  getMe,
  updateMe,
};
