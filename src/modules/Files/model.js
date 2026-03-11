const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    key: { type: String, required: true },
    mimetype: { type: String },
    size: { type: Number },
    hash: { type: String, required: true },
    refCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);

fileSchema.index({ hash: 1 }, { unique: true });

const File = mongoose.model("File", fileSchema);

module.exports = File;
