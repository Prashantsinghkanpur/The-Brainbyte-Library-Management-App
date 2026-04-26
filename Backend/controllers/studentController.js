const Student = require("../models/student");

// ADD STUDENT (with libraryId)
exports.addStudent = async (req, res) => {
  try {
    const student = await Student.create({
      name: req.body.name,
      phone: req.body.phone,
      seatNumber: req.body.seatNumber,
      plan: req.body.plan,
      paidTill: req.body.paidTill,

      // 🔥 VERY IMPORTANT (multi-library)
      libraryId: req.user.libraryId
    });

    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET STUDENTS (only your library)
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find({
      libraryId: req.user.libraryId
    });

    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};