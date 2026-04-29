const User = require("../models/User");
const Library = require("../models/Library");
const Payment = require("../models/payment");

const buildSettingsResponse = (user, library) => ({
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    themeMode: user.themeMode,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionRenewsAt: user.subscriptionRenewsAt
  },
  library: {
    id: library._id,
    name: library.name,
    ownerName: library.ownerName,
    phone: library.phone,
    createdAt: library.createdAt
  }
});

const getUserAndLibrary = async (req) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    return {};
  }

  const library = await Library.findById(user.libraryId);
  return { user, library };
};

exports.getSettingsProfile = async (req, res) => {
  try {
    const { user, library } = await getUserAndLibrary(req);

    if (!user || !library) {
      return res.status(404).json({ msg: "Profile not found" });
    }

    res.json(buildSettingsResponse(user, library));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSettingsProfile = async (req, res) => {
  try {
    const { user, library } = await getUserAndLibrary(req);

    if (!user || !library) {
      return res.status(404).json({ msg: "Profile not found" });
    }

    const { name, email, phone, libraryName } = req.body;

    if (name !== undefined) {
      user.name = name.trim();
      library.ownerName = name.trim();
    }

    if (email !== undefined) {
      user.email = email.trim().toLowerCase();
    }

    if (phone !== undefined) {
      library.phone = phone.trim();
    }

    if (libraryName !== undefined) {
      library.name = libraryName.trim();
    }

    await user.save();
    await library.save();

    res.json(buildSettingsResponse(user, library));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ msg: "Email is already registered" });
    }

    res.status(500).json({ error: err.message });
  }
};

exports.updateAppearance = async (req, res) => {
  try {
    const { themeMode } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (!themeMode) {
      return res.status(400).json({ msg: "themeMode is required" });
    }

    const normalizedThemeMode = themeMode.toUpperCase();

    if (!["LIGHT", "DARK", "SYSTEM"].includes(normalizedThemeMode)) {
      return res.status(400).json({ msg: "themeMode must be LIGHT, DARK or SYSTEM" });
    }

    user.themeMode = normalizedThemeMode;
    await user.save();

    res.json({ themeMode: user.themeMode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const renewsInDays = user.subscriptionRenewsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(user.subscriptionRenewsAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
          )
        )
      : 0;

    res.json({
      plan: user.subscriptionPlan,
      status: user.subscriptionStatus,
      renewsAt: user.subscriptionRenewsAt,
      renewsInDays
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBillingHistory = async (req, res) => {
  try {
    const payments = await Payment.find({
      libraryId: req.user.libraryId
    })
      .sort({ paymentDate: -1, createdAt: -1 })
      .limit(20)
      .populate("studentId", "memberId name");

    const history = payments.map((payment) => ({
      id: payment._id,
      type: "MEMBER_PAYMENT",
      amount: payment.amount,
      method: payment.method,
      paymentDate: payment.paymentDate,
      note: payment.notes,
      reference: payment.studentId
        ? `${payment.studentId.name} (#${payment.studentId.memberId})`
        : "Deleted student"
    }));

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
