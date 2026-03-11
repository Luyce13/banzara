const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    key: { type: String, required: true },
    mimetype: { type: String },
    size: { type: Number },
  },
  {
    timestamps: true,
  }
);

const File = mongoose.model('File', fileSchema);

module.exports = File;
