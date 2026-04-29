const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  libraryId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  key: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

counterSchema.index({ libraryId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model("Counter", counterSchema);
