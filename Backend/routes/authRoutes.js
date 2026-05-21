const router = require("express").Router();
const auth = require("../middleware/auth");
const requireAppAccess = require("../middleware/requireAppAccess");
const {
  register,
  login,
  createOwnerLibrary,
  getOwnerLibraries,
  switchOwnerLibrary
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/libraries", auth, getOwnerLibraries);
router.post("/libraries", auth, requireAppAccess, createOwnerLibrary);
router.post("/libraries/switch", auth, switchOwnerLibrary);

module.exports = router;
