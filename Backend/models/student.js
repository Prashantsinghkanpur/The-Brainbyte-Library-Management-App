const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  libraryId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  memberId: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  parentName: {
    type: String,
    trim: true,
    default: ""
  },
  parentPhone: {
    type: String,
    trim: true,
    default: ""
  },
  hallName: {
    type: String,
    default: "Main Hall",
    trim: true
  },
  seatNumber: {
    type: Number,
    required: true
  },
  shift: {
    type: String,
    enum: ["FULL_DAY", "MORNING", "EVENING", "CUSTOM"],
    default: "FULL_DAY"
  },
  plan: {
    type: String,
    required: true,
    trim: true
  },
  feeAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  joinedDate: {
    type: Date,
    default: Date.now
  },
  membershipStartDate: {
    type: Date,
    default: Date.now
  },
  paidTill: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ["ACTIVE", "INACTIVE"],
    default: "ACTIVE"
  },
  notes: {
    type: String,
    trim: true,
    default: ""
  }
}, { timestamps: true });

studentSchema.index({ libraryId: 1, memberId: 1 }, { unique: true });
studentSchema.index({ libraryId: 1, hallName: 1, seatNumber: 1 }, { unique: true });

module.exports = mongoose.model("Student", studentSchema);
