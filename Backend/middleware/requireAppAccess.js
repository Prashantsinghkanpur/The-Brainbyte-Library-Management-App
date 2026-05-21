const User = require("../models/User");
const Library = require("../models/Library");
const { hasAppAccess } = require("../utils/trialAccess");

module.exports = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (
      user.subscriptionStatus === "ACTIVE" &&
      user.subscriptionRenewsAt &&
      new Date(user.subscriptionRenewsAt).getTime() < Date.now()
    ) {
      user.subscriptionStatus = "EXPIRED";
      await user.save();
    }

    const library = await Library.findById(user.libraryId).select("createdAt");

    if (!library) {
      return res.status(404).json({ msg: "Library not found" });
    }

    if (!hasAppAccess(user, library.createdAt)) {
      return res.status(403).json({
        msg: "Your 200-hour trial has ended. Only Settings is available until you activate a plan."
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
