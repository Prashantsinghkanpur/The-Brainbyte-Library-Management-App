const Payment = require("../models/payment");
const Student = require("../models/student");
const mongoose = require("mongoose");
const { buildRangeMatch } = require("../utils/dateRange");

const normalizeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getStatusFromPaidTill = (paidTill) => {
  if (!paidTill) {
    return "INACTIVE";
  }

  const endDate = new Date(paidTill);
  endDate.setHours(23, 59, 59, 999);

  return endDate >= new Date() ? "ACTIVE" : "INACTIVE";
};

const buildPaymentSearchMatch = (search) => {
  if (!search) return [];

  const trimmedSearch = search.trim();
  if (!trimmedSearch) return [];

  const conditions = [
    { "student.name": { $regex: trimmedSearch, $options: "i" } },
    { notes: { $regex: trimmedSearch, $options: "i" } }
  ];

  const searchAsNumber = Number(trimmedSearch);

  if (!Number.isNaN(searchAsNumber)) {
    conditions.push(
      { "student.memberId": searchAsNumber },
      { "student.seatNumber": searchAsNumber },
      { amount: searchAsNumber }
    );
  }

  return conditions;
};

// ADD PAYMENT
exports.addPayment = async (req, res) => {
  try {
    const {
      studentId,
      amount,
      paidTill,
      paymentDate,
      membershipStartDate,
      method,
      notes
    } = req.body;

    if (!studentId || amount === undefined || !paidTill) {
      return res.status(400).json({
        msg: "studentId, amount and paidTill are required"
      });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ msg: "amount must be a positive number" });
    }

    const normalizedPaidTill = normalizeDate(paidTill);

    if (!normalizedPaidTill) {
      return res.status(400).json({ msg: "paidTill is not a valid date" });
    }

    const normalizedPaymentDate = normalizeDate(paymentDate) || new Date();

    if (paymentDate && !normalizeDate(paymentDate)) {
      return res.status(400).json({ msg: "paymentDate is not a valid date" });
    }

    const student = await Student.findOne({
      _id: studentId,
      libraryId: req.user.libraryId
    });

    if (!student) {
      return res.status(404).json({ msg: "Student not found" });
    }

    const previousStudentState = {
      membershipStartDate: student.membershipStartDate,
      paidTill: student.paidTill,
      status: student.status
    };

    const normalizedMembershipStartDate =
      normalizeDate(membershipStartDate) ||
      normalizeDate(student.paidTill) ||
      normalizeDate(student.membershipStartDate) ||
      normalizedPaymentDate;

    if (membershipStartDate && !normalizeDate(membershipStartDate)) {
      return res.status(400).json({ msg: "membershipStartDate is not a valid date" });
    }

    student.membershipStartDate = normalizedMembershipStartDate;
    student.paidTill = normalizedPaidTill;
    student.status = getStatusFromPaidTill(normalizedPaidTill);

    try {
      await student.save();

      const payment = await Payment.create({
        libraryId: req.user.libraryId,
        studentId: student._id,
        amount: numericAmount,
        method: method ? method.toUpperCase() : "CASH",
        paymentDate: normalizedPaymentDate,
        membershipStartDate: normalizedMembershipStartDate,
        paidTill: normalizedPaidTill,
        notes: notes ? notes.trim() : ""
      });

      const populatedPayment = await Payment.findById(payment._id).populate(
        "studentId",
        "memberId name phone hallName seatNumber shift plan status"
      );

      return res.status(201).json(populatedPayment);
    } catch (err) {
      student.membershipStartDate = previousStudentState.membershipStartDate;
      student.paidTill = previousStudentState.paidTill;
      student.status = previousStudentState.status;

      try {
        await student.save();
      } catch (rollbackError) {
        console.log("Payment rollback failed:", rollbackError.message);
      }

      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET PAYMENT HISTORY
exports.getPayments = async (req, res) => {
  try {
    const { search, method, year, month, studentId, sort = "latest" } = req.query;
    const match = {
      libraryId: new mongoose.Types.ObjectId(req.user.libraryId)
    };

    if (method) {
      match.method = method.toUpperCase();
    }

    if (studentId) {
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ msg: "studentId must be a valid id" });
      }

      match.studentId = new mongoose.Types.ObjectId(studentId);
    }

    const rangeResult = buildRangeMatch(year, month, "paymentDate");

    if (rangeResult.error) {
      return res.status(400).json({ msg: rangeResult.error });
    }

    Object.assign(match, rangeResult.match);

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student"
        }
      },
      {
        $unwind: {
          path: "$student",
          preserveNullAndEmptyArrays: true
        }
      }
    ];

    const searchConditions = buildPaymentSearchMatch(search);

    if (searchConditions.length > 0) {
      pipeline.push({ $match: { $or: searchConditions } });
    }

    const sortMap = {
      latest: { paymentDate: -1, createdAt: -1 },
      oldest: { paymentDate: 1, createdAt: 1 },
      amountHigh: { amount: -1, paymentDate: -1 },
      amountLow: { amount: 1, paymentDate: -1 }
    };

    pipeline.push({ $sort: sortMap[sort] || sortMap.latest });

    const payments = await Payment.aggregate(pipeline);

    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPaymentSummary = async (req, res) => {
  try {
    const { year, month } = req.query;
    const match = {
      libraryId: new mongoose.Types.ObjectId(req.user.libraryId)
    };
    const rangeResult = buildRangeMatch(year, month, "paymentDate");

    if (rangeResult.error) {
      return res.status(400).json({ msg: rangeResult.error });
    }

    Object.assign(match, rangeResult.match);

    const [summary] = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
          methods: { $push: "$method" },
          studentIds: { $addToSet: "$studentId" }
        }
      }
    ]);

    res.json({
      totalRevenue: summary?.totalRevenue || 0,
      totalTransactions: summary?.totalTransactions || 0,
      paidStudents: summary?.studentIds?.length || 0,
      methods: (summary?.methods || []).reduce((acc, current) => {
        acc[current] = (acc[current] || 0) + 1;
        return acc;
      }, {})
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
