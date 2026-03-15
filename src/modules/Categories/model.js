const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      en: { type: String, required: true, trim: true },
      tr: { type: String, required: true, trim: true },
      ar: { type: String, required: true, trim: true },
    },
    slug: { type: String, required: true, unique: true },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    attributeSchema: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        type: {
          type: String,
          enum: ["text", "number", "enum", "boolean"],
          required: true,
        },
        options: [String],
        required: { type: Boolean, default: false },
        filterable: { type: Boolean, default: true },
      },
    ],
  },
  {
    timestamps: true,
  },
);

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
