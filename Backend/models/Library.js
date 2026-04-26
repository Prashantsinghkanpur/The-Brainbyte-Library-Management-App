const mongoose = require("mongoose");

const librarySchema = new mongoose.Schema({
  name: String,
  ownerName: String,
  phone: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Library", librarySchema);