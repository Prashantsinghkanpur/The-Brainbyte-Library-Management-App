const mongoose = require("mongoose");

const appSubscriptionPaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  libraryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Library",
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  currency: {
    type: String,
    default: "INR",
    trim: true
  },
  plan: {
    type: String,
    enum: ["PRO"],
    default: "PRO"
  },
  status: {
    type: String,
    enum: ["CREATED", "PAID", "FAILED"],
    default: "CREATED",
    index: true
  },
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  razorpayPaymentId: {
    type: String,
    trim: true
  },
  razorpaySignature: {
    type: String,
    trim: true
  },
  paidAt: {
    type: Date
  },
  renewsAt: {
    type: Date
  }
}, { timestamps: true });

appSubscriptionPaymentSchema.index({ libraryId: 1, createdAt: -1 });
appSubscriptionPaymentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("AppSubscriptionPayment", appSubscriptionPaymentSchema);
