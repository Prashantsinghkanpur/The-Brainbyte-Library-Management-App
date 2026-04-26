const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  libraryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Library"
  }
});

module.exports = mongoose.model("User", userSchema);