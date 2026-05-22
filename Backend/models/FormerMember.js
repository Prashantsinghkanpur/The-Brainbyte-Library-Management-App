const mongoose = require("mongoose");

const formerMemberSchema = new mongoose.Schema({
  libraryId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  originalStudentId: {
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
  email: {
    type: String,
    trim: true,
    default: ""
  },
  address: {
    type: String,
    trim: true,
    default: ""
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
    default: "INACTIVE"
  },
  notes: {
    type: String,
    trim: true,
    default: ""
  },
  archivedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

formerMemberSchema.index({ libraryId: 1, archivedAt: -1 });
formerMemberSchema.index({ libraryId: 1, memberId: 1 });

module.exports = mongoose.model("FormerMember", formerMemberSchema);
