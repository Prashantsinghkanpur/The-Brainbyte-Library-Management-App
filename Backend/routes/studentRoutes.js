const router = require("express").Router();
const auth = require("../middleware/auth");
const requireAppAccess = require("../middleware/requireAppAccess");
const {
  addStudent,
  getStudents,
  getStudentById,
  updateStudent,
  archiveStudent,
  getFormerMembers,
  deleteFormerMember
} = require("../controllers/studentController");

router.post("/", auth, requireAppAccess, addStudent);
router.get("/", auth, requireAppAccess, getStudents);
router.get("/former-members", auth, requireAppAccess, getFormerMembers);
router.delete("/former-members/:id", auth, requireAppAccess, deleteFormerMember);
router.get("/:id", auth, requireAppAccess, getStudentById);
router.patch("/:id", auth, requireAppAccess, updateStudent);
router.delete("/:id", auth, requireAppAccess, archiveStudent);

module.exports = router;
