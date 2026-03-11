const moment = require("moment");
const { ENV, API_CONFIG } = require("../../constants");
const tokenService = require("../Tokens/service");
const userService = require("../Users/service");
const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiError = require("../../utils/ApiError");

const generateAuthTokens = async (user) => {
  const accessTokenExpires = moment().add(ENV.JWT_ACCESS_EXPIRATION_MINUTES, "minutes");
  const accessToken = tokenService.generateToken(user.id, accessTokenExpires, "access");

  const authTokens = {
    access: { token: accessToken, expires: accessTokenExpires.toDate() },
  };

  if (ENV.AUTH_STRATEGY === "dual") {
    const refreshTokenExpires = moment().add(ENV.JWT_REFRESH_EXPIRATION_DAYS, "days");
    const refreshToken = tokenService.generateToken(user.id, refreshTokenExpires, "refresh");
    await tokenService.saveToken(refreshToken, user.id, refreshTokenExpires, "refresh");

    authTokens.refresh = { token: refreshToken, expires: refreshTokenExpires.toDate() };
  }
  return authTokens;
};

const sendVerificationEmail = async (to, token) => {
  const verificationEmailUrl = `http://localhost:${ENV.PORT}${API_CONFIG.PREFIX}/auth/verify-email?token=${token}`;
  const text = `Dear user,\nTo verify your email, click on this link: ${verificationEmailUrl}\nIf you did not create an account, then ignore this email.`;
  await require("../../utils/email").sendEmail(to, "Verify your Email", text);
};

const register = async (userBody) => {
  const user = await userService.createUser(userBody);
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);
  await sendVerificationEmail(user.email, verifyEmailToken);
  return user;
};

const login = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Incorrect email or password");
  }
  if (!user.isEmailVerified) {
    throw new ApiError(httpStatus.FORBIDDEN, "Please verify your email to log in");
  }
  const tokens = await generateAuthTokens(user);
  return { user, tokens };
};

const refreshAuth = async (refreshToken) => {
  if (!refreshToken) throw new ApiError(httpStatus.UNAUTHORIZED, "Please authenticate");
  try {
    const refreshDoc = await tokenService.verifyToken(refreshToken, "refresh");
    const user = await require("../Users/model").findById(refreshDoc.user);
    if (!user) throw new Error();
    await refreshDoc.deleteOne();
    return generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Please authenticate");
  }
};

const verifyEmail = async (verifyEmailToken) => {
  try {
    const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, "verifyEmail");
    const user = await require("../Users/model").findById(verifyEmailTokenDoc.user);
    if (!user) throw new Error();
    
    await require("../Users/model").updateOne({ _id: user.id }, { isEmailVerified: true });
    await verifyEmailTokenDoc.deleteOne();
    
    return await generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Email verification failed");
  }
};

const resendVerificationEmail = async (email) => {
  const user = await userService.getUserByEmail(email);
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  if (user.isEmailVerified) throw new ApiError(httpStatus.BAD_REQUEST, "Email is already verified");
  
  const existingToken = await require("../Tokens/model").findOne({ user: user.id, type: "verifyEmail" }).sort({ createdAt: -1 });
  if (existingToken && Date.now() - existingToken.createdAt.getTime() < 30000) {
    throw new ApiError(httpStatus.TOO_MANY_REQUESTS, "Please wait 30 seconds before requesting another email");
  }
  
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);
  await sendVerificationEmail(user.email, verifyEmailToken);
};

const forgotPassword = async (email) => {
  const user = await userService.getUserByEmail(email);
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  
  const existingToken = await require("../Tokens/model").findOne({ user: user.id, type: "resetPassword" }).sort({ createdAt: -1 });
  if (existingToken && Date.now() - existingToken.createdAt.getTime() < 30000) {
    throw new ApiError(httpStatus.TOO_MANY_REQUESTS, "Please wait 30 seconds before requesting another email");
  }

  const resetPasswordToken = await tokenService.generateResetPasswordToken(email);
  const resetPasswordUrl = `http://localhost:${ENV.PORT}${API_CONFIG.PREFIX}/auth/reset-password?token=${resetPasswordToken}`;
  const text = `Dear user,\nTo reset your password, click on this link: ${resetPasswordUrl}\nIf you did not request this, please ignore this email.`;
  await require("../../utils/email").sendEmail(email, "Reset Password", text);
};

const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, "resetPassword");
    const user = await require("../Users/model").findById(resetPasswordTokenDoc.user);
    if (!user) throw new Error();
    
    user.password = newPassword;
    await user.save();
    
    await require("../Tokens/model").deleteMany({ user: user.id, type: "refresh" });
    await resetPasswordTokenDoc.deleteOne();
    
    return await generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Password reset failed");
  }
};

const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await require("../Users/model").findById(userId);
  if (!user || !(await user.isPasswordMatch(oldPassword))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Incorrect old password");
  }
  user.password = newPassword;
  await user.save();
  await require("../Tokens/model").deleteMany({ user: user.id, type: "refresh" });
  return await generateAuthTokens(user);
};

module.exports = {
  generateAuthTokens,
  refreshAuth,
  verifyEmail,
  sendVerificationEmail,
  register,
  login,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  changePassword,
};


