const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  addPayment,
  getPayments,
  getPaymentSummary
} = require("../controllers/paymentController");

router.post("/", auth, addPayment);
router.get("/", auth, getPayments);
router.get("/summary", auth, getPaymentSummary);

module.exports = router;
