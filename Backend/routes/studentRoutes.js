const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  addStudent,
  getStudents,
  getStudentById,
  updateStudent,
  archiveStudent,
  getFormerMembers,
  deleteFormerMember
} = require("../controllers/studentController");

router.post("/", auth, addStudent);
router.get("/", auth, getStudents);
router.get("/former-members", auth, getFormerMembers);
router.delete("/former-members/:id", auth, deleteFormerMember);
router.get("/:id", auth, getStudentById);
router.patch("/:id", auth, updateStudent);
router.delete("/:id", auth, archiveStudent);

module.exports = router;
