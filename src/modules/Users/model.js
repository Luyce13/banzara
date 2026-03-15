const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      private: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
    userType: {
      type: String,
      enum: ["individual", "business", "agent"],
      default: "individual",
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
    },
    address: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
      label: String, // Human readable address
    },
    avgRating: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    businessProfile: {
      legalName: { type: String, trim: true },
      taxId: { type: String, trim: true },
      businessHours: { type: String },
      googleMapsUrl: { type: String },
      website: { type: String },
      description: {
        en: { type: String },
        tr: { type: String },
        ar: { type: String },
      },
    },
    contactMethods: {
      whatsapp: { type: String },
      phone: { type: String },
      telegram: { type: String },
    },
  },
  {
    timestamps: true,
  },
);

userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

userSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

userSchema.pre("save", async function () {
  const user = this;
  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 8);
  }
});

// Remove password when returning JSON payload
userSchema.set("toJSON", {
  transform: function (doc, ret, options) {
    delete ret.password;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
