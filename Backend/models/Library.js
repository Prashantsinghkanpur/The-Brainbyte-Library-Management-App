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
  seatCount: {
    type: Number,
    default: 0,
    min: 0
  },
  logoDataUrl: {
    type: String,
    default: ""
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Library", librarySchema);
