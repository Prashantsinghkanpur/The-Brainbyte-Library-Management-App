const mongoose = require("mongoose");

const hallSchema = new mongoose.Schema({
  libraryId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  totalSeats: {
    type: Number,
    required: true,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

hallSchema.index({ libraryId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Hall", hallSchema);
