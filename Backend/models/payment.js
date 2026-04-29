const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  libraryId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  method: {
    type: String,
    enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"],
    default: "CASH"
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  membershipStartDate: {
    type: Date,
    required: true
  },
  paidTill: {
    type: Date,
    required: true
  },
  notes: {
    type: String,
    trim: true,
    default: ""
  }
}, { timestamps: true });

paymentSchema.index({ libraryId: 1, paymentDate: -1 });
paymentSchema.index({ libraryId: 1, studentId: 1, paymentDate: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
