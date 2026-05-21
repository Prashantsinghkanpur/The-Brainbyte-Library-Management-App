const router = require("express").Router();
const auth = require("../middleware/auth");
const requireAppAccess = require("../middleware/requireAppAccess");
const {
  addPayment,
  getPayments,
  getPaymentSummary,
  updatePayment,
  deletePayment
} = require("../controllers/paymentController");

router.post("/", auth, requireAppAccess, addPayment);
router.get("/", auth, requireAppAccess, getPayments);
router.get("/summary", auth, requireAppAccess, getPaymentSummary);
router.patch("/:id", auth, requireAppAccess, updatePayment);
router.delete("/:id", auth, requireAppAccess, deletePayment);

module.exports = router;
