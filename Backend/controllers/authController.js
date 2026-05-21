const User = require("../models/User");
const Library = require("../models/Library");
const Hall = require("../models/Hall");
const AppSubscriptionPayment = require("../models/AppSubscriptionPayment");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { buildTrialAccessResponse } = require("../utils/trialAccess");

const normalizeSeatCount = (value) => {
  const seatCount = Number(value);
  return Number.isInteger(seatCount) && seatCount > 0 ? seatCount : null;
};

const buildAuthResponse = (user, library = null) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  libraryId: user.libraryId,
  managedLibraryIds: user.managedLibraryIds?.length ? user.managedLibraryIds : [user.libraryId],
  role: user.role,
  themeMode: user.themeMode,
  subscriptionPlan: user.subscriptionPlan,
  subscriptionStatus: user.subscriptionStatus,
  subscriptionRenewsAt: user.subscriptionRenewsAt,
  ...buildTrialAccessResponse(library?.createdAt)
});

// REGISTER
exports.register = async (req, res) => {
  const { name, email, password, libraryName, phone, address, seatCount } = req.body;

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ msg: "JWT secret is not configured" });
    }

    if (!name || !email || !password || !libraryName || !phone || seatCount === undefined) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    const normalizedSeatCount = normalizeSeatCount(seatCount);

    if (!normalizedSeatCount) {
      return res.status(400).json({ msg: "seatCount must be a positive whole number" });
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
      phone: phone.trim(),
      address: address?.trim() || "",
      seatCount: normalizedSeatCount
    });
    await Hall.create({
      libraryId: library._id,
      name: "Main Hall",
      totalSeats: normalizedSeatCount
    });

    // hash password
    const hashed = await bcrypt.hash(password, 10);

    try {
      // create user
      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashed,
        libraryId: library._id,
        managedLibraryIds: [library._id]
      });

      const token = jwt.sign(
        { userId: user._id, libraryId: user.libraryId },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(201).json({
        token,
        user: buildAuthResponse(user, library)
      });
    } catch (err) {
      await Hall.deleteMany({ libraryId: library._id });
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

    if (!user.managedLibraryIds?.length) {
      user.managedLibraryIds = [user.libraryId];
      await user.save();
    }

    const library = await Library.findById(user.libraryId).select("createdAt");

    res.json({
      token,
      user: buildAuthResponse(user, library)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createOwnerLibrary = async (req, res) => {
  const {
    libraryName,
    address,
    phone,
    seatCount,
    subscriptionAmount,
    paymentMethod,
    paymentReference,
    paymentScope = "NEW_LIBRARY"
  } = req.body;

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ msg: "JWT secret is not configured" });
    }

    if (!libraryName || !phone || seatCount === undefined || subscriptionAmount === undefined) {
      return res.status(400).json({ msg: "libraryName, phone, seatCount and subscriptionAmount are required" });
    }

    const normalizedSeatCount = normalizeSeatCount(seatCount);
    const numericAmountPerSeat = Number(subscriptionAmount);

    if (!normalizedSeatCount) {
      return res.status(400).json({ msg: "seatCount must be a positive whole number" });
    }

    if (!Number.isFinite(numericAmountPerSeat) || numericAmountPerSeat <= 0) {
      return res.status(400).json({ msg: "subscriptionAmount must be a positive per-seat amount" });
    }

    const normalizedPaymentScope = paymentScope === "ALL_LIBRARIES" ? "ALL_LIBRARIES" : "NEW_LIBRARY";

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    let library;
    let createdPaymentIds = [];
    let totalPaymentAmount = 0;

    try {
      library = await Library.create({
        name: libraryName.trim(),
        ownerName: user.name,
        phone: phone.trim(),
        address: address?.trim() || "",
        seatCount: normalizedSeatCount
      });
      await Hall.create({
        libraryId: library._id,
        name: "Main Hall",
        totalSeats: normalizedSeatCount
      });

      const renewsAt = new Date();
      renewsAt.setDate(renewsAt.getDate() + 30);

      const existingLibraryIds = (user.managedLibraryIds?.length ? user.managedLibraryIds : [req.user.libraryId])
        .map((id) => id.toString());

      const paidLibraryIds = normalizedPaymentScope === "ALL_LIBRARIES"
        ? [...new Set([...existingLibraryIds, library._id.toString()])]
        : [library._id.toString()];
      const paidLibraries = await Library.find({ _id: { $in: paidLibraryIds } });
      const seatCountByLibraryId = new Map(
        paidLibraries.map((paidLibrary) => [
          paidLibrary._id.toString(),
          Math.max(1, Number(paidLibrary.seatCount || 0))
        ])
      );

      const paymentBatch = `${library._id}_${Date.now()}`;
      const payments = await AppSubscriptionPayment.insertMany(
        paidLibraryIds.map((libraryId, index) => {
          const billedSeatCount = seatCountByLibraryId.get(libraryId) || 1;

          return {
            userId: user._id,
            libraryId,
            amount: numericAmountPerSeat * billedSeatCount,
            seatCount: billedSeatCount,
            amountPerSeat: numericAmountPerSeat,
            status: "PAID",
            razorpayOrderId: paymentReference?.trim()
              ? `manual_${paymentBatch}_${index}_${paymentReference.trim()}`
              : `manual_${paymentBatch}_${index}`,
            razorpayPaymentId: paymentMethod?.trim() || "MANUAL",
            razorpaySignature: paymentReference?.trim() || "manual-entry",
            paidAt: new Date(),
            renewsAt
          };
        })
      );

      createdPaymentIds = payments.map((payment) => payment._id);
      totalPaymentAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

      user.libraryId = library._id;
      // Creating/switching libraries via this flow should not automatically upgrade the owner.
      // Owner starts on FREE plan; PRO is activated only after subscription payment verification.
      user.subscriptionPlan = user.subscriptionPlan || "FREE";
      user.subscriptionStatus = user.subscriptionStatus === "ACTIVE" ? "ACTIVE" : "EXPIRED";
      user.subscriptionRenewsAt = user.subscriptionRenewsAt || renewsAt;
      // If the owner was PRO already, keep it; otherwise stay FREE.
      if (user.subscriptionPlan !== "PRO") {
        user.subscriptionPlan = "FREE";
      }

      if (!existingLibraryIds.includes(library._id.toString())) {
        existingLibraryIds.push(library._id.toString());
      }

      user.managedLibraryIds = existingLibraryIds;
      await user.save();
    } catch (err) {
      if (library?._id) {
        await Hall.deleteMany({ libraryId: library._id });
        await Library.findByIdAndDelete(library._id);
      }

      if (createdPaymentIds.length) {
        await AppSubscriptionPayment.deleteMany({ _id: { $in: createdPaymentIds } });
      }

      throw err;
    }

    const token = jwt.sign(
      { userId: user._id, libraryId: user.libraryId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: buildAuthResponse(user, library),
      library,
      payment: {
        amountPerSeat: numericAmountPerSeat,
        seatCount: normalizedSeatCount,
        amount: numericAmountPerSeat * normalizedSeatCount,
        totalAmount: totalPaymentAmount,
        currency: "INR",
        scope: normalizedPaymentScope,
        libraryCount: createdPaymentIds.length || 1,
        status: "PAID",
        renewsAt: user.subscriptionRenewsAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOwnerLibraries = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const libraryIds = user.managedLibraryIds?.length
      ? user.managedLibraryIds
      : [user.libraryId];

    const libraries = await Library.find({
      _id: { $in: libraryIds }
    }).sort({ createdAt: 1 });

    res.json({
      activeLibraryId: user.libraryId,
      libraries
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.switchOwnerLibrary = async (req, res) => {
  const { libraryId } = req.body;

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ msg: "JWT secret is not configured" });
    }

    if (!libraryId) {
      return res.status(400).json({ msg: "libraryId is required" });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const allowedLibraryIds = (user.managedLibraryIds?.length ? user.managedLibraryIds : [user.libraryId])
      .map((id) => id.toString());

    if (!allowedLibraryIds.includes(libraryId)) {
      return res.status(403).json({ msg: "You do not have access to this library" });
    }

    const library = await Library.findById(libraryId);

    if (!library) {
      return res.status(404).json({ msg: "Library not found" });
    }

    user.libraryId = library._id;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, libraryId: user.libraryId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: buildAuthResponse(user, library),
      library
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
