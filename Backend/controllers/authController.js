const User = require("../models/User");
const Library = require("../models/Library");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const buildAuthResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  libraryId: user.libraryId,
  role: user.role,
  themeMode: user.themeMode,
  subscriptionPlan: user.subscriptionPlan,
  subscriptionStatus: user.subscriptionStatus,
  subscriptionRenewsAt: user.subscriptionRenewsAt
});

// REGISTER
exports.register = async (req, res) => {
  const { name, email, password, libraryName, phone } = req.body;

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ msg: "JWT secret is not configured" });
    }

    if (!name || !email || !password || !libraryName || !phone) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ msg: "Email is already registered" });
    }

    // create library
    const library = await Library.create({
      name: libraryName.trim(),
      ownerName: name.trim(),
      phone: phone.trim()
    });

    // hash password
    const hashed = await bcrypt.hash(password, 10);

    try {
      // create user
      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashed,
        libraryId: library._id
      });

      const token = jwt.sign(
        { userId: user._id, libraryId: user.libraryId },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(201).json({
        token,
        user: buildAuthResponse(user)
      });
    } catch (err) {
      await Library.findByIdAndDelete(library._id);
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ msg: "JWT secret is not configured" });
    }

    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) return res.status(400).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) return res.status(400).json({ msg: "Wrong password" });

    const token = jwt.sign(
      { userId: user._id, libraryId: user.libraryId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: buildAuthResponse(user)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
