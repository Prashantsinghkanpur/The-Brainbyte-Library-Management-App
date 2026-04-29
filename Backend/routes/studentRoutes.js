const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  addStudent,
  getStudents,
  getStudentById,
  updateStudent
} = require("../controllers/studentController");

router.post("/", auth, addStudent);
router.get("/", auth, getStudents);
router.get("/:id", auth, getStudentById);
router.patch("/:id", auth, updateStudent);

module.exports = router;
