const Student = require("../models/student");
const FormerMember = require("../models/FormerMember");
const Counter = require("../models/Counter");
const { ensureHallCapacity } = require("./seatController");

const normalizeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const isValidPhone = (value) => /^\d{10}$/.test(value);

const getPlanDays = (plan) => {
  const match = String(plan || "").match(/\d+/);
  const months = match ? Number(match[0]) : 0;
  return months > 0 ? months * 30 : 0;
};

const buildPaidTillFromPlan = (startDate, plan) => {
  const days = getPlanDays(plan);

  if (!days || !startDate) return null;

  const paidTill = new Date(startDate);

  if (Number.isNaN(paidTill.getTime())) return null;

  paidTill.setDate(paidTill.getDate() + days - 1);
  return paidTill;
};

const getStatusFromPaidTill = (paidTill) => {
  if (!paidTill) {
    return "INACTIVE";
  }

  const endDate = new Date(paidTill);
  endDate.setHours(23, 59, 59, 999);

  return endDate >= new Date() ? "ACTIVE" : "INACTIVE";
};

const getTodayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getNextMemberId = async (libraryId) => {
  const counter = await Counter.findOneAndUpdate(
    { libraryId, key: "student_member_id" },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" }
  );

  return counter.value;
};

// ADD STUDENT
exports.addStudent = async (req, res) => {
  try {
    const {
      name,
      phone,
      parentName,
      parentPhone,
      seatNumber,
      plan,
      feeAmount,
      paidTill,
      hallName,
      shift,
      joinedDate,
      membershipStartDate,
      notes
    } = req.body;

    if (!name || !phone || seatNumber === undefined || !plan || !joinedDate) {
      return res.status(400).json({
        msg: "name, phone, seatNumber, plan and joinedDate are required"
      });
    }

    const normalizedPhone = normalizePhone(phone);
    const normalizedParentPhone = parentPhone ? normalizePhone(parentPhone) : "";

    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ msg: "phone must be exactly 10 digits" });
    }

    if (normalizedParentPhone && !isValidPhone(normalizedParentPhone)) {
      return res.status(400).json({ msg: "parentPhone must be exactly 10 digits" });
    }

    const numericSeatNumber = Number(seatNumber);
    const numericFeeAmount = feeAmount === undefined ? 0 : Number(feeAmount);

    if (!Number.isInteger(numericSeatNumber) || numericSeatNumber <= 0) {
      return res.status(400).json({ msg: "seatNumber must be a positive number" });
    }

    if (!Number.isFinite(numericFeeAmount) || numericFeeAmount < 0) {
      return res.status(400).json({ msg: "feeAmount must be zero or a positive number" });
    }

    const normalizedJoinedDate = normalizeDate(joinedDate);

    if (!normalizedJoinedDate) {
      return res.status(400).json({ msg: "joinedDate is not a valid date" });
    }

    const normalizedMembershipStartDate =
      normalizeDate(membershipStartDate) || normalizedJoinedDate;
    const normalizedPaidTill =
      normalizeDate(paidTill) || buildPaidTillFromPlan(normalizedMembershipStartDate, plan);

    if (paidTill && !normalizeDate(paidTill)) {
      return res.status(400).json({ msg: "paidTill is not a valid date" });
    }
    const normalizedHallName = hallName ? hallName.trim() : "Main Hall";
    const normalizedShift = shift ? shift.toUpperCase() : "FULL_DAY";

    const existingSeat = await Student.findOne({
      libraryId: req.user.libraryId,
      hallName: normalizedHallName,
      seatNumber: numericSeatNumber
    });

    if (existingSeat) {
      return res.status(409).json({ msg: "Seat number is already assigned" });
    }

    await ensureHallCapacity(req.user.libraryId, normalizedHallName, numericSeatNumber);

    const student = await Student.create({
      libraryId: req.user.libraryId,
      memberId: await getNextMemberId(req.user.libraryId),
      name: name.trim(),
      phone: normalizedPhone,
      parentName: parentName ? parentName.trim() : "",
      parentPhone: normalizedParentPhone,
      hallName: normalizedHallName,
      seatNumber: numericSeatNumber,
      shift: normalizedShift,
      plan: plan.trim(),
      feeAmount: numericFeeAmount,
      joinedDate: normalizedJoinedDate,
      membershipStartDate: normalizedMembershipStartDate,
      paidTill: normalizedPaidTill,
      status: getStatusFromPaidTill(normalizedPaidTill),
      notes: notes ? notes.trim() : ""
    });

    res.status(201).json(student);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ msg: "Student data must be unique per library" });
    }

    res.status(500).json({ error: err.message });
  }
};

// GET STUDENTS
exports.getStudents = async (req, res) => {
  try {
    const { search, status, shift, hallName, paymentStatus, sort = "recent" } = req.query;
    const query = { libraryId: req.user.libraryId };

    if (status) {
      query.status = status.toUpperCase();
    }

    if (shift) {
      query.shift = shift.toUpperCase();
    }

    if (hallName) {
      query.hallName = hallName.trim();
    }

    const todayStart = getTodayStart();

    if (paymentStatus === "PAID") {
      query.paidTill = { $gte: todayStart };
    } else if (paymentStatus === "DUE") {
      query.$or = [
        { paidTill: { $lt: todayStart } },
        { paidTill: null }
      ];
    }

    if (search) {
      const trimmedSearch = search.trim();
      const searchConditions = [
        { name: { $regex: trimmedSearch, $options: "i" } },
        { phone: { $regex: trimmedSearch, $options: "i" } },
        { parentName: { $regex: trimmedSearch, $options: "i" } },
        { parentPhone: { $regex: trimmedSearch, $options: "i" } }
      ];

      const searchAsNumber = Number(trimmedSearch);

      if (!Number.isNaN(searchAsNumber)) {
        searchConditions.push(
          { memberId: searchAsNumber },
          { seatNumber: searchAsNumber }
        );
      }

      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions }
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const sortMap = {
      recent: { createdAt: -1 },
      name: { name: 1 },
      seat: { seatNumber: 1 },
      memberId: { memberId: 1 }
    };

    const students = await Student.find(query).sort(sortMap[sort] || sortMap.recent);

    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      libraryId: req.user.libraryId
    });

    if (!student) {
      return res.status(404).json({ msg: "Student not found" });
    }

    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.archiveStudent = async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      libraryId: req.user.libraryId
    });

    if (!student) {
      return res.status(404).json({ msg: "Student not found" });
    }

    const studentData = student.toObject();
    delete studentData._id;
    delete studentData.__v;
    delete studentData.createdAt;
    delete studentData.updatedAt;

    const formerMember = await FormerMember.create({
      ...studentData,
      originalStudentId: student._id,
      status: "INACTIVE",
      archivedAt: new Date()
    });

    await student.deleteOne();

    res.json({
      msg: "Student moved to former members and seat is now vacant",
      formerMember
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFormerMembers = async (req, res) => {
  try {
    const { search, sort = "recent" } = req.query;
    const query = { libraryId: req.user.libraryId };

    if (search) {
      const trimmedSearch = search.trim();
      const searchConditions = [
        { name: { $regex: trimmedSearch, $options: "i" } },
        { phone: { $regex: trimmedSearch, $options: "i" } },
        { parentName: { $regex: trimmedSearch, $options: "i" } },
        { parentPhone: { $regex: trimmedSearch, $options: "i" } },
        { hallName: { $regex: trimmedSearch, $options: "i" } }
      ];

      const searchAsNumber = Number(trimmedSearch);

      if (!Number.isNaN(searchAsNumber)) {
        searchConditions.push(
          { memberId: searchAsNumber },
          { seatNumber: searchAsNumber }
        );
      }

      query.$or = searchConditions;
    }

    const sortMap = {
      recent: { archivedAt: -1 },
      name: { name: 1 },
      seat: { seatNumber: 1 },
      memberId: { memberId: 1 }
    };

    const formerMembers = await FormerMember.find(query).sort(sortMap[sort] || sortMap.recent);

    res.json(formerMembers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteFormerMember = async (req, res) => {
  try {
    const formerMember = await FormerMember.findOne({
      _id: req.params.id,
      libraryId: req.user.libraryId
    });

    if (!formerMember) {
      return res.status(404).json({ msg: "Former member not found" });
    }

    await formerMember.deleteOne();

    res.json({ msg: "Former member permanently deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      libraryId: req.user.libraryId
    });

    if (!student) {
      return res.status(404).json({ msg: "Student not found" });
    }

    const {
      name,
      phone,
      parentName,
      parentPhone,
      seatNumber,
      plan,
      feeAmount,
      paidTill,
      hallName,
      shift,
      joinedDate,
      membershipStartDate,
      notes
    } = req.body;
    const nextHallName = hallName !== undefined ? hallName.trim() : student.hallName;

    if (name !== undefined) student.name = name.trim();
    if (phone !== undefined) {
      const normalizedPhone = normalizePhone(phone);

      if (!isValidPhone(normalizedPhone)) {
        return res.status(400).json({ msg: "phone must be exactly 10 digits" });
      }

      student.phone = normalizedPhone;
    }
    if (parentName !== undefined) student.parentName = parentName.trim();
    if (parentPhone !== undefined) {
      const normalizedParentPhone = normalizePhone(parentPhone);

      if (normalizedParentPhone && !isValidPhone(normalizedParentPhone)) {
        return res.status(400).json({ msg: "parentPhone must be exactly 10 digits" });
      }

      student.parentPhone = normalizedParentPhone;
    }
    if (plan !== undefined) student.plan = plan.trim();
    if (feeAmount !== undefined) {
      const numericFeeAmount = Number(feeAmount);

      if (!Number.isFinite(numericFeeAmount) || numericFeeAmount < 0) {
        return res.status(400).json({ msg: "feeAmount must be zero or a positive number" });
      }

      student.feeAmount = numericFeeAmount;
    }
    if (hallName !== undefined) student.hallName = nextHallName;
    if (shift !== undefined) student.shift = shift.toUpperCase();
    if (notes !== undefined) student.notes = notes.trim();

    if (seatNumber !== undefined || hallName !== undefined) {
      const numericSeatNumber =
        seatNumber !== undefined ? Number(seatNumber) : student.seatNumber;

      if (!Number.isInteger(numericSeatNumber) || numericSeatNumber <= 0) {
        return res.status(400).json({ msg: "seatNumber must be a positive number" });
      }

      const existingSeat = await Student.findOne({
        _id: { $ne: student._id },
        libraryId: req.user.libraryId,
        hallName: nextHallName,
        seatNumber: numericSeatNumber
      });

      if (existingSeat) {
        return res.status(409).json({ msg: "Seat number is already assigned" });
      }

      await ensureHallCapacity(req.user.libraryId, nextHallName, numericSeatNumber);
      student.seatNumber = numericSeatNumber;
    }

    if (joinedDate !== undefined) {
      const normalizedJoinedDate = normalizeDate(joinedDate);

      if (!normalizedJoinedDate) {
        return res.status(400).json({ msg: "joinedDate is not a valid date" });
      }

      student.joinedDate = normalizedJoinedDate;
    }

    if (membershipStartDate !== undefined) {
      const normalizedMembershipStartDate = normalizeDate(membershipStartDate);

      if (!normalizedMembershipStartDate) {
        return res.status(400).json({ msg: "membershipStartDate is not a valid date" });
      }

      student.membershipStartDate = normalizedMembershipStartDate;
    }

    if (paidTill !== undefined) {
      const normalizedPaidTill = normalizeDate(paidTill);

      if (paidTill && !normalizedPaidTill) {
        return res.status(400).json({ msg: "paidTill is not a valid date" });
      }

      student.paidTill = normalizedPaidTill;
      student.status = getStatusFromPaidTill(normalizedPaidTill);
    }

    await student.save();

    res.json(student);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ msg: "Student data must be unique per library" });
    }

    res.status(500).json({ error: err.message });
  }
};
