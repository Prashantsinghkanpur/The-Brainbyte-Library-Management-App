const User = require("../models/User");
const Library = require("../models/Library");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// REGISTER
exports.register = async (req, res) => {
  const { name, email, password, libraryName, phone } = req.body;

  try {
    // create library
    const library = await Library.create({
      name: libraryName,
      ownerName: name,
      phone
    });

    // hash password
    const hashed = await bcrypt.hash(password, 10);

    // create user
    const user = await User.create({
      name,
      email,
      password: hashed,
      libraryId: library._id
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) return res.status(400).json({ msg: "Wrong password" });

    const token = jwt.sign(
      { userId: user._id, libraryId: user.libraryId },
      "secret"
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};