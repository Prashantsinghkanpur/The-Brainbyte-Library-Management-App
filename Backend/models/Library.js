const mongoose = require("mongoose");

const librarySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  ownerName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    default: "",
    trim: true
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Library", librarySchema);
