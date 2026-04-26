const router = require("express").Router();

// import controller
const {
  addStudent,
  getStudents
} = require("../controllers/studentController");

// import auth middleware 🔐
const auth = require("../middleware/auth");

// PROTECTED ROUTES
// only logged-in user can access

// ADD STUDENT
router.post("/", auth, addStudent);

// GET ALL STUDENTS
router.get("/", auth, getStudents);

module.exports = router;