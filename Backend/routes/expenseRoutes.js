const router = require("express").Router();
const auth = require("../middleware/auth");
const { addExpense, getExpenses } = require("../controllers/expenseController");

router.post("/", auth, addExpense);
router.get("/", auth, getExpenses);

module.exports = router;
