const jwt = require("jsonwebtoken");
const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiError = require("../utils/ApiError");
const User = require("../modules/Users/model");
const catchAsync = require("../utils/catchAsync");
const { ENV } = require("../constants");

const auth = catchAsync(async (req, res, next) => {
  let token;
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Please authenticate");
  }

  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET);
    const user = await User.findById(payload.sub);

    if (!user) {
      throw new Error();
    }

    if (!user.isEmailVerified) {
      throw new ApiError(httpStatus.FORBIDDEN, "Please verify your email before accessing this resource");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.UNAUTHORIZED, "Please authenticate");
  }
});


module.exports = auth;
