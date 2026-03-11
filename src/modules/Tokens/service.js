const jwt = require("jsonwebtoken");
const moment = require("moment");
const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const { ENV } = require("../../constants");
const Token = require("./model");
const ApiError = require("../../utils/ApiError");

const generateToken = (userId, expires, type, secret = ENV.JWT_SECRET) => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};

const saveToken = async (token, userId, expires, type, blacklisted = false) => {
  const tokenDoc = await Token.create({
    token,
    user: userId,
    expires: expires.toDate(),
    type,
    blacklisted,
  });
  return tokenDoc;
};

const verifyToken = async (token, type) => {
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET);
    const tokenDoc = await Token.findOne({
      token,
      type,
      user: payload.sub,
      blacklisted: false,
    });
    if (!tokenDoc) {
      throw new Error("Token not found");
    }
    return tokenDoc;
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid or expired token");
  }
};

const revokeToken = async (refreshToken) => {
  const tokenDoc = await Token.findOneAndDelete({
    token: refreshToken,
    type: "refresh",
  });
  if (!tokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Token not found");
  }
  return true;
};

const generateResetPasswordToken = async (email) => {
  const user = await require("../Users/model").findOne({ email });
  if (!user) {
    const httpStatusObj = require("http-status");
    throw new ApiError(
      (httpStatusObj.status || httpStatusObj).NOT_FOUND,
      "No users found with this email",
    );
  }
  const expires = moment().add(
    ENV.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    "minutes",
  );
  const resetPasswordToken = generateToken(user.id, expires, "resetPassword");
  await saveToken(resetPasswordToken, user.id, expires, "resetPassword");
  return resetPasswordToken;
};

const generateVerifyEmailToken = async (user) => {
  const expires = moment().add(
    ENV.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
    "minutes",
  );
  const verifyEmailToken = generateToken(user.id, expires, "verifyEmail");
  await saveToken(verifyEmailToken, user.id, expires, "verifyEmail");
  return verifyEmailToken;
};

module.exports = {
  generateToken,
  saveToken,
  verifyToken,
  revokeToken,
  generateResetPasswordToken,
  generateVerifyEmailToken,
};
