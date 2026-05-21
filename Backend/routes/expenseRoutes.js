const router = require("express").Router();
const auth = require("../middleware/auth");
const requireAppAccess = require("../middleware/requireAppAccess");
const { addExpense, getExpenses } = require("../controllers/expenseController");

router.post("/", auth, requireAppAccess, addExpense);
router.get("/", auth, requireAppAccess, getExpenses);

module.exports = router;
