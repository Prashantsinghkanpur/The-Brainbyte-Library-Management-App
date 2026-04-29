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
    default: "PRO"
  },
  subscriptionStatus: {
    type: String,
    enum: ["ACTIVE", "EXPIRED", "CANCELED"],
    default: "ACTIVE"
  },
  subscriptionRenewsAt: {
    type: Date,
    default: () => {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    }
  },
  libraryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Library",
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
