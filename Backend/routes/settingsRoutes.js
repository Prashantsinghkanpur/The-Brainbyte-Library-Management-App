const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  getSettingsProfile,
  updateSettingsProfile,
  updateAppearance,
  getSubscription,
  getBillingHistory
} = require("../controllers/settingsController");

router.get("/profile", auth, getSettingsProfile);
router.patch("/profile", auth, updateSettingsProfile);
router.patch("/appearance", auth, updateAppearance);
router.get("/subscription", auth, getSubscription);
router.get("/billing-history", auth, getBillingHistory);

module.exports = router;
