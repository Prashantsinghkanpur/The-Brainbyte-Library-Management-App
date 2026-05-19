const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: "ADMIN",
    trim: true
  },
  themeMode: {
    type: String,
    enum: ["LIGHT", "DARK", "SYSTEM"],
    default: "LIGHT"
  },
  subscriptionPlan: {
    type: String,
    enum: ["FREE", "PRO"],
    default: "FREE"
  },
  subscriptionStatus: {
    type: String,
    enum: ["ACTIVE", "EXPIRED", "CANCELED"],
    default: "EXPIRED"
  },
  subscriptionGrantType: {
    type: String,
    enum: ["NONE", "PAID", "COMPLIMENTARY"],
    default: "NONE"
  },
  subscriptionRenewsAt: {
    type: Date,
    default: () => {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    }
  },
  complimentaryGrant: {
    grantedAt: {
      type: Date
    },
    grantedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    grantedByEmail: {
      type: String,
      lowercase: true,
      trim: true
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300
    },
    durationDays: {
      type: Number,
      min: 1
    },
    planKey: {
      type: String,
      trim: true
    }
  },
  libraryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Library",
    required: true
  },
  managedLibraryIds: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Library"
    }],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
