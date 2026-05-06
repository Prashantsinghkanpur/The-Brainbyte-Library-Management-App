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
  getBillingHistory
} = require("../controllers/settingsController");

router.get("/profile", auth, getSettingsProfile);
router.patch("/profile", auth, updateSettingsProfile);
router.patch("/appearance", auth, updateAppearance);
router.get("/subscription", auth, getSubscription);
router.patch("/subscription", auth, updateSubscription);
router.post("/subscription/order", auth, createSubscriptionOrder);
router.post("/subscription/verify", auth, verifySubscriptionPayment);
router.get("/billing-history", auth, getBillingHistory);

module.exports = router;
