// src/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  accounts: {
    instagram: { type: String },
    facebook: { type: String },
    linkedin: { type: String },
    twitter: { type: String },
    youtube: { type: String },
  },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
