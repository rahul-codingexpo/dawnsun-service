// models/Item.js
import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true }, // display name
  type: { type: String, enum: ["folder", "file"], required: true },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },

  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    default: null,
  },

  // File-only
  url: { type: String }, // /uploads/...
  mimeType: { type: String },
  size: { type: Number },
  originalName: { type: String },
  relativePath: { type: String }, // when uploading folder

  // Expiry
  expiryDate: { type: Date, default: null }, // null => lifetime

  // Access control
  allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // empty => admin-only unless policy says otherwise
  isRestricted: { type: Boolean, default: false }, // if true, only allowedUsers (and admins) can see

  // 🔹 NEW: Department-level access
  department: {
    type: String,
    enum: ["sales", "hr", "management", "development", "all", "none"],
    default: "none",
  },
  sharedDepartments: { type: [String], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

const Item = mongoose.model("Item", itemSchema);
export default Item;
