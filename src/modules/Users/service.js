const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiError = require("../../utils/ApiError");
const User = require("./model");

const createUser = async (userBody) => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
  }
  return User.create(userBody);
};

const getUserByEmail = async (email) => {
  return User.findOne({ email });
};

const getUserById = async (id) => {
  return User.findById(id);
};

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
};
