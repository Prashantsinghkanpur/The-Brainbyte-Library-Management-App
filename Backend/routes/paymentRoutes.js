const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  addPayment,
  getPayments,
  getPaymentSummary,
  updatePayment,
  deletePayment
} = require("../controllers/paymentController");

router.post("/", auth, addPayment);
router.get("/", auth, getPayments);
router.get("/summary", auth, getPaymentSummary);
router.patch("/:id", auth, updatePayment);
router.delete("/:id", auth, deletePayment);

module.exports = router;
