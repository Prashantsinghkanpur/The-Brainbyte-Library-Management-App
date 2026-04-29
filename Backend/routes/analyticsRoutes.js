const router = require("express").Router();
const auth = require("../middleware/auth");
const { getAnalyticsSummary } = require("../controllers/analyticsController");

router.get("/summary", auth, getAnalyticsSummary);

module.exports = router;
