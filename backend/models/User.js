const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  phone: { type: String, default: "" },
  designation: { type: String, default: "" },
  affiliation: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
