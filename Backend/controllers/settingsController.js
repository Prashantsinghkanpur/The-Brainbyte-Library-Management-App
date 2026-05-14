const User = require("../models/User");
const Library = require("../models/Library");
const Hall = require("../models/Hall");
const AppSubscriptionPayment = require("../models/AppSubscriptionPayment");
const crypto = require("crypto");
const https = require("https");

const MAX_LOGO_DATA_URL_LENGTH = 350000;

const APP_SUBSCRIPTION_PLANS = {
  "1_MONTH": { months: 1, days: 30, label: "1 Month", price: 249 },
  "3_MONTHS": { months: 3, days: 90, label: "3 Months", price: 599 },
  "6_MONTHS": { months: 6, days: 180, label: "6 Months", price: 999 },
  "12_MONTHS": { months: 12, days: 360, label: "1 Year", price: 1799 }
};

const getAppSubscriptionPlan = (planKey) => {
  const normalized = String(planKey || "").toUpperCase();
  return APP_SUBSCRIPTION_PLANS[normalized] || null;
};

const LOGO_DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;

const getSubscriptionAmount = () => {
  const amount = Number(process.env.APP_SUBSCRIPTION_AMOUNT || 499);
  return Number.isFinite(amount) && amount > 0 ? amount : 499;
};

const getPerSeatSubscriptionAmount = () => {
  const amount = Number(process.env.APP_SUBSCRIPTION_AMOUNT_PER_SEAT || 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const normalizeSeatCount = (value) => {
  const seatCount = Number(value);
  return Number.isInteger(seatCount) && seatCount > 0 ? seatCount : null;
};

const getSubscriptionPricing = (library) => {
  const seatCount = Math.max(1, Number(library?.seatCount || 0));
  const amountPerSeat = getPerSeatSubscriptionAmount();

  if (amountPerSeat > 0) {
    return {
      amount: amountPerSeat * seatCount,
      amountPerSeat,
      seatCount
    };
  }

  return {
    amount: getSubscriptionAmount(),
    amountPerSeat: 0,
    seatCount
  };
};

const getRazorpayCredentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured");
  }

  return { keyId, keySecret };
};

const createRazorpayOrder = ({ amount, currency, receipt, notes }) => {
  const { keyId, keySecret } = getRazorpayCredentials();
  const payload = JSON.stringify({
    amount,
    currency,
    receipt,
    notes
  });

  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "api.razorpay.com",
        path: "/v1/orders",
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        }
      },
      (response) => {
        let body = "";

        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          let parsedBody = {};

          try {
            parsedBody = body ? JSON.parse(body) : {};
          } catch (err) {
            return reject(new Error("Razorpay returned an invalid response"));
          }

          if (response.statusCode >= 200 && response.statusCode < 300) {
            return resolve(parsedBody);
          }

          reject(new Error(parsedBody.error?.description || "Unable to create Razorpay order"));
        });
      }
    );

    request.on("error", reject);
    request.write(payload);
    request.end();
  });
};

const fetchRazorpayOrder = (orderId) => {
  const { keyId, keySecret } = getRazorpayCredentials();
  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "api.razorpay.com",
        path: `/v1/orders/${orderId}`,
        method: "GET",
        headers: {
          Authorization: `Basic ${authHeader}`
        }
      },
      (response) => {
        let body = "";

        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          let parsedBody = {};

          try {
            parsedBody = body ? JSON.parse(body) : {};
          } catch (err) {
            return reject(new Error("Razorpay returned an invalid order response"));
          }

          if (response.statusCode >= 200 && response.statusCode < 300) {
            return resolve(parsedBody);
          }

          reject(new Error(parsedBody.error?.description || "Unable to fetch Razorpay order"));
        });
      }
    );

    request.on("error", reject);
    request.end();
  });
};

const fetchRazorpayOrderPayments = (orderId) => {
  const { keyId, keySecret } = getRazorpayCredentials();
  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "api.razorpay.com",
        path: `/v1/orders/${orderId}/payments`,
        method: "GET",
        headers: {
          Authorization: `Basic ${authHeader}`
        }
      },
      (response) => {
        let body = "";

        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          let parsedBody = {};

          try {
            parsedBody = body ? JSON.parse(body) : {};
          } catch (err) {
            return reject(new Error("Razorpay returned an invalid payment response"));
          }

          if (response.statusCode >= 200 && response.statusCode < 300) {
            return resolve(Array.isArray(parsedBody?.items) ? parsedBody.items : []);
          }

          reject(new Error(parsedBody.error?.description || "Unable to fetch Razorpay order payments"));
        });
      }
    );

    request.on("error", reject);
    request.end();
  });
};

const buildRenewalDate = (currentRenewal, planDays) => {
  const renewalBase = currentRenewal ? new Date(currentRenewal) : new Date();
  const safeBase = renewalBase > new Date() ? renewalBase : new Date();
  safeBase.setDate(safeBase.getDate() + planDays);
  return safeBase;
};

const getStoredSubscriptionPlanDays = async (paymentRecord) => {
  const storedPlanDays = Number(paymentRecord.subscriptionPlanDays || 0);
  if (storedPlanDays > 0) {
    return storedPlanDays;
  }

  const order = await fetchRazorpayOrder(paymentRecord.razorpayOrderId);
  const subscriptionPlanKey = String(order?.notes?.subscriptionPlanKey || "").toUpperCase();
  const subscriptionPlanLabel = String(order?.notes?.subscriptionPlanLabel || "").trim();
  const subscriptionPlanDays = Number(order?.notes?.subscriptionPlanDays || 0);

  if (!subscriptionPlanDays) {
    return 0;
  }

  paymentRecord.subscriptionPlanKey = subscriptionPlanKey || paymentRecord.subscriptionPlanKey;
  paymentRecord.subscriptionPlanLabel = subscriptionPlanLabel || paymentRecord.subscriptionPlanLabel;
  paymentRecord.subscriptionPlanDays = subscriptionPlanDays;

  if (!paymentRecord.amount && Number(order?.amount || 0) > 0) {
    paymentRecord.amount = Number(order.amount) / 100;
  }

  await paymentRecord.save();
  return subscriptionPlanDays;
};

const syncPendingSubscriptionPayment = async (user, paymentRecord) => {
  if (!paymentRecord || paymentRecord.status !== "CREATED") {
    return false;
  }

  const subscriptionPlanDays = await getStoredSubscriptionPlanDays(paymentRecord);
  if (!subscriptionPlanDays) {
    return false;
  }

  const order = await fetchRazorpayOrder(paymentRecord.razorpayOrderId);
  if (String(order?.status || "").toLowerCase() !== "paid") {
    return false;
  }

  const payments = await fetchRazorpayOrderPayments(paymentRecord.razorpayOrderId);
  const successfulPayment = payments.find(
    (payment) => payment?.captured || ["captured", "authorized"].includes(String(payment?.status || "").toLowerCase())
  );

  const renewsAt = buildRenewalDate(user.subscriptionRenewsAt, subscriptionPlanDays);

  paymentRecord.status = "PAID";
  paymentRecord.razorpayPaymentId = successfulPayment?.id || paymentRecord.razorpayPaymentId;
  paymentRecord.paidAt = paymentRecord.paidAt || (
    successfulPayment?.created_at
      ? new Date(Number(successfulPayment.created_at) * 1000)
      : new Date()
  );
  paymentRecord.renewsAt = renewsAt;

  user.subscriptionPlan = "PRO";
  user.subscriptionStatus = "ACTIVE";
  user.subscriptionRenewsAt = renewsAt;

  await paymentRecord.save();
  await user.save();
  return true;
};

const syncLatestPendingSubscription = async (user) => {
  if (!user?._id || !user?.libraryId) {
    return false;
  }

  try {
    const latestPendingPayment = await AppSubscriptionPayment.findOne({
      userId: user._id,
      libraryId: user.libraryId,
      status: "CREATED"
    }).sort({ createdAt: -1 });

    return syncPendingSubscriptionPayment(user, latestPendingPayment);
  } catch (err) {
    return false;
  }
};


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
    address: library.address || "",
    seatCount: library.seatCount || 0,
    logoDataUrl: library.logoDataUrl || "",
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

// Public endpoint helpers (no auth)
const buildPublicQRResponse = (library, seatGrid = null) => {
  if (!library) return null;

  return {
    libraryId: library._id.toString(),
    libraryName: library.name,
    seatCount: Number(library.seatCount || 0),
    seatGrid
  };
};

const refreshExpiredSubscription = (user) => {
  if (
    user.subscriptionStatus === "ACTIVE" &&
    user.subscriptionRenewsAt &&
    new Date(user.subscriptionRenewsAt).getTime() < Date.now()
  ) {
    user.subscriptionStatus = "EXPIRED";
  }
};

const buildSubscriptionResponse = (user, libraryOrPayment = null) => {
  const renewsInDays = user.subscriptionRenewsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(user.subscriptionRenewsAt).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const hasPaymentPricing =
    typeof libraryOrPayment?.amount === "number" &&
    typeof libraryOrPayment?.seatCount === "number";

  const pricing = hasPaymentPricing
    ? {
        amount: libraryOrPayment.amount,
        amountPerSeat: libraryOrPayment.amountPerSeat || 0,
        seatCount: libraryOrPayment.seatCount || 0
      }
    : getSubscriptionPricing(libraryOrPayment);

  return {
    plan: user.subscriptionPlan,
    status: user.subscriptionStatus,
    renewsAt: user.subscriptionRenewsAt,
    renewsInDays,
    ...pricing
  };
};

exports.getSettingsProfile = async (req, res) => {
  try {
    const { user, library } = await getUserAndLibrary(req);

    if (!user || !library) {
      return res.status(404).json({ msg: "Profile not found" });
    }

    await syncLatestPendingSubscription(user);
    refreshExpiredSubscription(user);
    if (user.isModified("subscriptionStatus")) {
      await user.save();
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

    const { name, email, phone, libraryName, address, seatCount, logoDataUrl } = req.body;

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

    if (address !== undefined) {
      library.address = address.trim();
    }

    if (seatCount !== undefined) {
      const normalizedSeatCount = normalizeSeatCount(seatCount);

      if (!normalizedSeatCount) {
        return res.status(400).json({ msg: "seatCount must be a positive whole number" });
      }

      library.seatCount = normalizedSeatCount;

      const halls = await Hall.find({
        libraryId: library._id,
        isActive: true
      }).sort({ createdAt: 1 });
      const totalHallSeats = halls.reduce((sum, hall) => sum + Number(hall.totalSeats || 0), 0);

      if (halls.length === 0) {
        await Hall.create({
          libraryId: library._id,
          name: "Main Hall",
          totalSeats: normalizedSeatCount
        });
      } else if (totalHallSeats < normalizedSeatCount) {
        const mainHall = halls.find((hall) => hall.name === "Main Hall") || halls[0];
        mainHall.totalSeats += normalizedSeatCount - totalHallSeats;
        await mainHall.save();
      }
    }

    if (logoDataUrl !== undefined) {
      const normalizedLogo = String(logoDataUrl || "").trim();

      if (
        normalizedLogo &&
        (
          normalizedLogo.length > MAX_LOGO_DATA_URL_LENGTH ||
          !LOGO_DATA_URL_PATTERN.test(normalizedLogo)
        )
      ) {
        return res.status(400).json({ msg: "Logo must be a PNG, JPG, WEBP, or GIF image under 350 KB" });
      }

      library.logoDataUrl = normalizedLogo;
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

    await syncLatestPendingSubscription(user);
    refreshExpiredSubscription(user);
    if (user.isModified("subscriptionStatus")) {
      await user.save();
    }

    const library = await Library.findById(user.libraryId);
    res.json(buildSubscriptionResponse(user, library));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const { action } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (!action) {
      return res.status(400).json({ msg: "action is required" });
    }

    const normalizedAction = action.toUpperCase();

    if (normalizedAction === "RESTORE") {
      await syncLatestPendingSubscription(user);
      refreshExpiredSubscription(user);

      const latestPaidSubscription = await AppSubscriptionPayment.findOne({
        userId: user._id,
        libraryId: user.libraryId,
        status: "PAID",
        renewsAt: { $gt: new Date() }
      }).sort({ renewsAt: -1, paidAt: -1, createdAt: -1 });

      const hasValidPaidAccess =
        latestPaidSubscription ||
        (
          user.subscriptionPlan === "PRO" &&
          user.subscriptionRenewsAt &&
          new Date(user.subscriptionRenewsAt).getTime() > Date.now()
        );

      if (!hasValidPaidAccess) {
        return res.status(400).json({ msg: "No paid subscription found to restore. Please renew through checkout." });
      }

      user.subscriptionPlan = "PRO";
      user.subscriptionStatus = "ACTIVE";
      if (latestPaidSubscription?.renewsAt) {
        user.subscriptionRenewsAt = latestPaidSubscription.renewsAt;
      }
    } else if (normalizedAction === "RENEW") {
      return res.status(400).json({ msg: "Use Razorpay checkout to renew" });
    } else if (normalizedAction === "CANCEL") {
      return res.status(400).json({ msg: "Cancellation is not needed for one-time plans. Your paid access stays active until expiry." });
    } else {
      return res.status(400).json({ msg: "action must be RENEW, RESTORE or CANCEL" });
    }

    await user.save();

    const library = await Library.findById(user.libraryId);
    // IMPORTANT: subscriptionStatus must be immediately updated for ProtectedRoute gating
    // to work after payment/restore/cancel.
    refreshExpiredSubscription(user);

    res.json(buildSubscriptionResponse(user, library));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createSubscriptionOrder = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const library = await Library.findById(user.libraryId);

    if (!library) {
      return res.status(404).json({ msg: "Library not found" });
    }

    const { plan } = req.body || {};
    const normalizedPlan = getAppSubscriptionPlan(plan);

    if (!normalizedPlan) {
      return res.status(400).json({ msg: "Invalid plan" });
    }

    const seatCount = Math.max(1, Number(library?.seatCount || 0));

    // Hardcoded pricing as requested (no per-seat logic for app subscription)
    const displayAmount = normalizedPlan.price;
    const amountInPaise = Math.round(displayAmount * 100);

    const receipt = `sub_${user._id}_${Date.now()}`.slice(0, 40);
    const order = await createRazorpayOrder({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        userId: user._id.toString(),
        libraryId: user.libraryId.toString(),
        seatCount: String(seatCount),
        amountPerSeat: "0",
        plan: "PRO",
        subscriptionPlanKey: String(plan).toUpperCase(),
        subscriptionPlanLabel: normalizedPlan.label,
        subscriptionPlanDays: String(normalizedPlan.days)
      }
    });

    await AppSubscriptionPayment.create({
      userId: user._id,
      libraryId: user.libraryId,
      amount: displayAmount,
      seatCount,
      amountPerSeat: 0,
      currency: order.currency || "INR",
      razorpayOrderId: order.id,
      subscriptionPlanKey: String(plan).toUpperCase(),
      subscriptionPlanLabel: normalizedPlan.label,
      subscriptionPlanDays: normalizedPlan.days,
      status: "CREATED",
      plan: "PRO"
    });

    res.status(201).json({
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan: "PRO",
      displayAmount,
      seatCount,
      amountPerSeat: 0,
      name: "Brainbyte Pro",
      subscriptionPlan: normalizedPlan.label,
      subscriptionPlanDays: normalizedPlan.days,
      description: `${normalizedPlan.days}-day app subscription (${normalizedPlan.label})`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.verifySubscriptionPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;


    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ msg: "Razorpay payment details are required" });
    }

    const paymentRecord = await AppSubscriptionPayment.findOne({
      razorpayOrderId: razorpay_order_id,
      userId: req.user.userId,
      libraryId: req.user.libraryId
    });

    if (!paymentRecord) {
      return res.status(404).json({ msg: "Subscription order not found" });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (paymentRecord.status === "PAID") {
      return res.json(buildSubscriptionResponse(user, paymentRecord));
    }

    const { keySecret } = getRazorpayCredentials();
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${paymentRecord.razorpayOrderId}|${razorpay_payment_id}`)
      .digest("hex");
    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(razorpay_signature);

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      paymentRecord.status = "FAILED";
      await paymentRecord.save();
      return res.status(400).json({ msg: "Payment verification failed" });
    }

    const subscriptionPlanDays = await getStoredSubscriptionPlanDays(paymentRecord);
    if (!subscriptionPlanDays) {
      return res.status(400).json({ msg: "Subscription plan days not found" });
    }

    const renewsAt = buildRenewalDate(user.subscriptionRenewsAt, subscriptionPlanDays);


    paymentRecord.status = "PAID";
    paymentRecord.razorpayPaymentId = razorpay_payment_id;
    paymentRecord.razorpaySignature = razorpay_signature;
    paymentRecord.paidAt = new Date();
    paymentRecord.renewsAt = renewsAt;

    user.subscriptionPlan = "PRO";
    user.subscriptionStatus = "ACTIVE";
    user.subscriptionRenewsAt = renewsAt;

    await paymentRecord.save();
    await user.save();

    res.json(buildSubscriptionResponse(user, paymentRecord));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBillingHistory = async (req, res) => {
  try {
    const payments = await AppSubscriptionPayment.find({
      libraryId: req.user.libraryId
    })
      .sort({ createdAt: -1 })
      .limit(20);

    const history = payments.map((payment) => ({
      id: payment._id,
      type: "APP_SUBSCRIPTION",
      amount: payment.amount,
      seatCount: payment.seatCount || 0,
      amountPerSeat: payment.amountPerSeat || 0,
      method: "RAZORPAY",
      status: payment.status,
      paymentDate: payment.paidAt || payment.createdAt,
      note: payment.status === "PAID" ? "Brainbyte Pro subscription" : "Checkout created",
      reference: payment.razorpayPaymentId || payment.razorpayOrderId
    }));

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Public: QR seat snapshot + full seat grid (public / no auth)
exports.getPublicSeatSnapshot = async (req, res) => {
  try {
    const { libraryId } = req.params;

    if (!libraryId) {
      return res.status(400).json({ msg: "libraryId is required" });
    }

    const library = await Library.findById(libraryId);
    if (!library) {
      return res.status(404).json({ msg: "Library not found" });
    }

    // Fetch halls + students publicly (no auth)
    // This matches the same seat grid behavior as /api/seats/grid:
    // - pick Main Hall (or first hall)
    // - build per-seat tiles up to hall.totalSeats
    const Hall = require("../models/Hall");
    const Student = require("../models/student");

    let halls = await Hall.find({
      libraryId,
      isActive: true
    }).sort({ createdAt: 1 });

    // Ensure library seats visibility like seatController does
    const librarySeatCount = Number(library?.seatCount || 0);
    if (librarySeatCount > 0) {
      if (halls.length === 0) {
        halls = [
          await Hall.create({
            libraryId,
            name: "Main Hall",
            totalSeats: librarySeatCount
          })
        ];
      } else {
        const totalHallSeats = halls.reduce((sum, hall) => sum + Number(hall.totalSeats || 0), 0);
        if (totalHallSeats < librarySeatCount) {
          const mainHall = halls.find((hall) => hall.name === "Main Hall") || halls[0];
          mainHall.totalSeats += librarySeatCount - totalHallSeats;
          await mainHall.save();
        }
      }
    }

    const selectedHall = halls.find((hall) => hall.name === "Main Hall") || halls[0] || null;

    const allStudents = await Student.find({
      libraryId
    }).sort({ hallName: 1, seatNumber: 1 });

    const totalSeats = halls.reduce((sum, hall) => sum + Number(hall.totalSeats || 0), 0);
    const filledSeats = allStudents.length;

    if (!selectedHall) {
      return res.json(
        buildPublicQRResponse(library, {
          summary: {
            filledSeats,
            vacantSeats: Math.max(0, totalSeats - filledSeats),
            totalStudents: allStudents.length,
            totalSeats
          },
          halls: [],
          selectedHall: null,
          seats: []
        })
      );
    }

    const selectedStudents = allStudents.filter((s) => s.hallName === selectedHall.name);
    const studentMap = new Map(selectedStudents.map((s) => [s.seatNumber, s]));

    const getDuesState = (student) => {
      if (!student?.paidTill) return "UNPAID";
      const endDate = new Date(student.paidTill);
      endDate.setHours(23, 59, 59, 999);
      return endDate >= new Date() ? "PAID" : "UNPAID";
    };

    const getDaysRemaining = (paidTill) => {
      if (!paidTill) return 0;
      const target = new Date(paidTill);
      target.setHours(23, 59, 59, 999);
      const diffMs = target.getTime() - Date.now();
      return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    };

    const seats = [];

    for (let seatNumber = 1; seatNumber <= selectedHall.totalSeats; seatNumber += 1) {
      const student = studentMap.get(seatNumber) || null;
      const occupancyStatus = student ? "OCCUPIED" : "VACANT";
      const duesState = student ? getDuesState(student) : null;

      seats.push({
        seatNumber,
        hallName: selectedHall.name,
        occupancyStatus,
        student: student
          ? {
              id: student._id,
              memberId: student.memberId,
              name: student.name,
              shift: student.shift,
              status: student.status,
              duesState,
              daysRemaining: getDaysRemaining(student.paidTill)
            }
          : null
      });
    }

    return res.json(
      buildPublicQRResponse(library, {
        summary: {
          filledSeats,
          vacantSeats: Math.max(0, totalSeats - filledSeats),
          totalStudents: allStudents.length,
          totalSeats
        },
        halls,
        selectedHall,
        seats
      })
    );
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
