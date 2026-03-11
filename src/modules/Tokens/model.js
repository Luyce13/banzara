const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["refresh", "resetPassword", "verifyEmail"],
      required: true,
    },
    expires: {
      type: Date,
      required: true,
    },
    blacklisted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// TTL index to automatically remove expired tokens
tokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

const Token = mongoose.model("Token", tokenSchema);

module.exports = Token;
