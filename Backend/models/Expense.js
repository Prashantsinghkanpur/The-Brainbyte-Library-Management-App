const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  libraryId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  category: {
    type: String,
    trim: true,
    default: "GENERAL"
  },
  expenseDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    default: ""
  }
}, { timestamps: true });

expenseSchema.index({ libraryId: 1, expenseDate: -1 });

module.exports = mongoose.model("Expense", expenseSchema);
