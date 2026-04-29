const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  createHall,
  getHalls,
  updateHall,
  deleteHall,
  getSeatGrid
} = require("../controllers/seatController");

router.get("/grid", auth, getSeatGrid);
router.get("/halls", auth, getHalls);
router.post("/halls", auth, createHall);
router.patch("/halls/:id", auth, updateHall);
router.delete("/halls/:id", auth, deleteHall);

module.exports = router;
