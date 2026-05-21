const router = require("express").Router();
const auth = require("../middleware/auth");
const requireAppAccess = require("../middleware/requireAppAccess");
const {
  createHall,
  getHalls,
  updateHall,
  deleteHall,
  getSeatGrid
} = require("../controllers/seatController");

router.get("/grid", auth, requireAppAccess, getSeatGrid);
router.get("/halls", auth, requireAppAccess, getHalls);
router.post("/halls", auth, requireAppAccess, createHall);
router.patch("/halls/:id", auth, requireAppAccess, updateHall);
router.delete("/halls/:id", auth, requireAppAccess, deleteHall);

module.exports = router;
