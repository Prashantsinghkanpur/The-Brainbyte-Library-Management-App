const router = require("express").Router();
const auth = require("../middleware/auth");
const requireAppAccess = require("../middleware/requireAppAccess");
const { getAnalyticsSummary } = require("../controllers/analyticsController");

router.get("/summary", auth, requireAppAccess, getAnalyticsSummary);

module.exports = router;
