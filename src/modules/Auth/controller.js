const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiResponse = require("../../utils/ApiResponse");
const catchAsync = require("../../utils/catchAsync");
const logger = require("../../utils/logger").child({ context: "Auth" });
const authService = require("./service");
const tokenService = require("../Tokens/service");
const { ENV } = require("../../constants");

const processTokensForResponse = (res, tokens) => {
  if (!tokens) return {};
  if (tokens.access) {
    res.cookie("accessToken", tokens.access.token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      expires: tokens.access.expires,
      domain: "localhost",
    });
    delete tokens.access;
  }
  if (ENV.AUTH_STRATEGY === "dual") {
    if (tokens.refresh) {
      res.cookie("refreshToken", tokens.refresh.token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        expires: tokens.refresh.expires,
        domain: "localhost",
      });
    }
  }
  delete tokens.refresh;
  return { tokens };
};

const register = catchAsync(async (req, res) => {
  const user = await authService.register(req.body);
  return ApiResponse(
    res,
    httpStatus.CREATED,
    "User registered successfully. Please verify your email.",
  );
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const { user, tokens } = await authService.login(email, password);
  const tokenPayload = processTokensForResponse(res, tokens);
  return ApiResponse(res, httpStatus.OK, "Login successful", {
    user,
    ...tokenPayload,
  });
});

const logout = catchAsync(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    await tokenService.revokeToken(refreshToken);
  }
  res.clearCookie("refreshToken");
  res.clearCookie("accessToken");
  return ApiResponse(res, httpStatus.OK, "Logged out successfully");
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokenToRefresh = req.cookies?.refreshToken;
  const tokens = await authService.refreshAuth(tokenToRefresh);
  const tokenPayload = processTokensForResponse(res, tokens);
  return ApiResponse(
    res,
    httpStatus.OK,
    "Tokens refreshed successfully",
    tokenPayload,
  );
});

const verifyEmail = catchAsync(async (req, res) => {
  const tokens = await authService.verifyEmail(req.query.token);
  const tokenPayload = processTokensForResponse(res, tokens);
  return ApiResponse(
    res,
    httpStatus.OK,
    "Email verified successfully",
    tokenPayload,
  );
});

const resendVerificationEmail = catchAsync(async (req, res) => {
  await authService.resendVerificationEmail(req.body.email);
  return ApiResponse(res, httpStatus.OK, "Verification email sent");
});

const forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  return ApiResponse(res, httpStatus.OK, "Password reset email sent");
});

const resetPassword = catchAsync(async (req, res) => {
  const tokens = await authService.resetPassword(
    req.query.token,
    req.body.password,
  );
  const tokenPayload = processTokensForResponse(res, tokens);
  return ApiResponse(
    res,
    httpStatus.OK,
    "Password reset successfully",
    tokenPayload,
  );
});

const changePassword = catchAsync(async (req, res) => {
  const tokens = await authService.changePassword(
    req.user.id,
    req.body.oldPassword,
    req.body.newPassword,
  );
  const tokenPayload = processTokensForResponse(res, tokens);
  return ApiResponse(
    res,
    httpStatus.OK,
    "Password changed successfully",
    tokenPayload,
  );
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  changePassword,
};
