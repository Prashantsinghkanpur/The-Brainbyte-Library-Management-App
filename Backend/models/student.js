const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  // 🔥 IMPORTANT (multi-tenant support)
  libraryId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  name: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    required: true
  },

  seatNumber: {
    type: Number,
    required: true
  },

  plan: {
    type: String,
    required: true
  },

  paidTill: {
    type: Date
  },

  status: {
    type: String,
    default: "ACTIVE"
  }
});

module.exports = mongoose.model("Student", studentSchema);