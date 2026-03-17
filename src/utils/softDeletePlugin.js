const mongoose = require("mongoose");

/**
 * Mongoose Soft Delete Plugin
 *
 * Adds `isDeleted`, `deletedAt`, and `deletedBy` fields to any schema.
 * Automatically filters out soft-deleted documents from all queries.
 *
 * Usage:
 *   schema.plugin(require('../../utils/softDeletePlugin'));
 *
 * Bypass soft-delete filter:
 *   Model.find().setOptions({ includeDeleted: true })
 *
 * Soft delete a document:
 *   doc.softDelete(userId)
 *
 * Restore a soft-deleted document:
 *   doc.restore()
 */
module.exports = (schema) => {
  // Add soft-delete fields if not already present
  if (!schema.path("isDeleted")) {
    schema.add({
      isDeleted: {
        type: Boolean,
        default: false,
        index: true,
      },
      deletedAt: { type: Date },
      deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    });
  }

  // Middleware to filter out deleted records by default
  const filterMiddleware = function () {
    if (this.options && this.options.includeDeleted) {
      return;
    }
    this.where({ isDeleted: { $ne: true } });
  };

  schema.pre("find", filterMiddleware);
  schema.pre("findOne", filterMiddleware);
  schema.pre("findOneAndUpdate", filterMiddleware);
  schema.pre("updateMany", filterMiddleware);
  schema.pre("countDocuments", filterMiddleware);
  schema.pre("count", filterMiddleware);
  schema.pre("aggregate", function () {
    if (this.options && this.options.includeDeleted) {
      return;
    }
    this.pipeline().unshift({
      $match: { isDeleted: false },
    });
  });

  // Instance method to soft delete
  schema.methods.softDelete = async function (userId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    if (userId) this.deletedBy = userId;
    return this.save();
  };

  // Instance method to restore
  schema.methods.restore = async function () {
    this.isDeleted = false;
    this.deletedAt = undefined;
    this.deletedBy = undefined;
    return this.save();
  };
};
