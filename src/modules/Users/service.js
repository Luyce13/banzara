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

const fileService = require("../Files/service");

const getUserById = async (id) => {
  return User.findById(id).populate("avatar", "url");
};

const updateUserById = async (userId, updateBody) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
  }

  // Handle avatar refCount balancing
  if (updateBody.avatar) {
    const oldAvatarId = user.avatar ? String(user.avatar) : null;
    const newAvatarId = String(updateBody.avatar);

    if (oldAvatarId !== newAvatarId) {
      // It's a new avatar, decrement the old one
      if (oldAvatarId) {
        await fileService.decrementRefCount(oldAvatarId);
      }
    } else {
      // It's the same avatar, decrement the new one to balance the optimistic increment
      await fileService.decrementRefCount(newAvatarId);
    }
  }

  Object.assign(user, updateBody);
  await user.save();
  return await user.populate("avatar", "url");
};

const getBusinessDirectory = async (query, options) => {
  const filter = {
    ...query,
    userType: { $in: ["business", "agent"] },
    isDeleted: false,
  };

  const users = await User.find(filter)
    .sort(options.sort || { "businessProfile.companyName": 1 })
    .skip(options.skip)
    .limit(options.limit)
    .select("name avatar userType businessProfile address contactInfo")
    .populate("avatar", "url")
    .lean();

  const total = await User.countDocuments(filter);

  return {
    users,
    total,
    page: options.page,
    pages: Math.ceil(total / options.limit),
  };
};

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  updateUserById,
  getBusinessDirectory,
};
