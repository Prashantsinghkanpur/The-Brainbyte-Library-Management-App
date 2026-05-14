const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  getSettingsProfile,
  updateSettingsProfile,
  updateAppearance,
  getSubscription,
  updateSubscription,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  getBillingHistory,
  getPublicSeatSnapshot
} = require("../controllers/settingsController");

router.get("/profile", auth, getSettingsProfile);
router.patch("/profile", auth, updateSettingsProfile);
router.patch("/appearance", auth, updateAppearance);
router.get("/subscription", auth, getSubscription);
router.patch("/subscription", auth, updateSubscription);
router.post("/subscription/order", auth, createSubscriptionOrder);
router.post("/subscription/verify", auth, verifySubscriptionPayment);
router.get("/billing-history", auth, getBillingHistory);

// Public: QR seat snapshot (no auth)
router.get("/qr/seat-snapshot/:libraryId", getPublicSeatSnapshot);

module.exports = router;
