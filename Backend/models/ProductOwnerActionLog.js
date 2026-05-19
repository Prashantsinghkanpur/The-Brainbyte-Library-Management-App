const mongoose = require("mongoose");

const productOwnerActionLogSchema = new mongoose.Schema({
  actorUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  actorEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  actionType: {
    type: String,
    enum: ["GRANT_COMPLIMENTARY_PRO", "CANCEL_SUBSCRIPTION"],
    required: true,
    index: true
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  targetEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  targetLibraryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Library",
    index: true
  },
  previousSubscriptionPlan: {
    type: String,
    trim: true
  },
  previousSubscriptionStatus: {
    type: String,
    trim: true
  },
  previousSubscriptionGrantType: {
    type: String,
    trim: true
  },
  previousSubscriptionRenewsAt: {
    type: Date
  },
  nextSubscriptionPlan: {
    type: String,
    trim: true
  },
  nextSubscriptionStatus: {
    type: String,
    trim: true
  },
  nextSubscriptionGrantType: {
    type: String,
    trim: true
  },
  nextSubscriptionRenewsAt: {
    type: Date
  },
  note: {
    type: String,
    trim: true,
    maxlength: 500
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

productOwnerActionLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ProductOwnerActionLog", productOwnerActionLogSchema);
