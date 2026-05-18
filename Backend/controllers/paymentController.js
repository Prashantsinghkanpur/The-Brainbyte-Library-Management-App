const Payment = require("../models/payment");
const Student = require("../models/student");
const mongoose = require("mongoose");
const { buildRangeMatch } = require("../utils/dateRange");
const PAYMENT_METHODS = new Set(["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"]);

const normalizeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeMethod = (value) => {
  const method = value ? String(value).toUpperCase() : "CASH";
  return PAYMENT_METHODS.has(method) ? method : null;
};

const getStatusFromPaidTill = (paidTill) => {
  if (!paidTill) {
    return "INACTIVE";
  }

  const endDate = new Date(paidTill);
  endDate.setHours(23, 59, 59, 999);

  return endDate >= new Date() ? "ACTIVE" : "INACTIVE";
};

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

const syncStudentFromLatestPayment = async (studentId, libraryId) => {
  if (!studentId) {
    return;
  }

  const student = await Student.findOne({ _id: studentId, libraryId });

  if (!student) {
    return;
  }

  const latestPayment = await Payment.findOne({ studentId, libraryId }).sort({ paymentDate: -1, createdAt: -1 });

  if (latestPayment) {
    student.membershipStartDate = latestPayment.membershipStartDate;
    student.paidTill = latestPayment.paidTill;
    student.status = getStatusFromPaidTill(latestPayment.paidTill);
  } else {
    student.membershipStartDate = student.joinedDate || student.membershipStartDate || new Date();
    student.paidTill = null;
    student.status = "INACTIVE";
  }

  await student.save();
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

    if (!studentId || amount === undefined) {
      return res.status(400).json({
        msg: "studentId and amount are required"
      });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ msg: "amount must be a positive number" });
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
    const normalizedPaidTill =
      normalizeDate(paidTill) || buildPaidTillFromPlan(normalizedMembershipStartDate, student.plan);

    if (!normalizedPaidTill) {
      return res.status(400).json({ msg: "paidTill is required when the student's plan has no month duration" });
    }

    if (paidTill && !normalizeDate(paidTill)) {
      return res.status(400).json({ msg: "paidTill is not a valid date" });
    }

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

exports.updatePayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: "Payment id must be a valid id" });
    }

    const payment = await Payment.findOne({
      _id: id,
      libraryId: req.user.libraryId
    });

    if (!payment) {
      return res.status(404).json({ msg: "Payment not found" });
    }

    const {
      studentId,
      amount,
      paidTill,
      paymentDate,
      membershipStartDate,
      method,
      notes
    } = req.body;

    const previousStudentId = String(payment.studentId);
    const targetStudentId = studentId || previousStudentId;

    if (!mongoose.Types.ObjectId.isValid(targetStudentId)) {
      return res.status(400).json({ msg: "studentId must be a valid id" });
    }

    const student = await Student.findOne({
      _id: targetStudentId,
      libraryId: req.user.libraryId
    });

    if (!student) {
      return res.status(404).json({ msg: "Student not found" });
    }

    if (amount !== undefined) {
      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ msg: "amount must be a positive number" });
      }

      payment.amount = numericAmount;
    }

    if (paymentDate !== undefined) {
      const normalizedPaymentDate = normalizeDate(paymentDate);

      if (paymentDate && !normalizedPaymentDate) {
        return res.status(400).json({ msg: "paymentDate is not a valid date" });
      }

      payment.paymentDate = normalizedPaymentDate || new Date();
    }

    const resolvedMembershipStartDate =
      membershipStartDate !== undefined
        ? normalizeDate(membershipStartDate)
        : normalizeDate(payment.membershipStartDate);

    if (membershipStartDate !== undefined && membershipStartDate && !resolvedMembershipStartDate) {
      return res.status(400).json({ msg: "membershipStartDate is not a valid date" });
    }

    const effectiveMembershipStartDate =
      resolvedMembershipStartDate ||
      normalizeDate(student.paidTill) ||
      normalizeDate(student.membershipStartDate) ||
      normalizeDate(payment.paymentDate) ||
      new Date();

    const resolvedPaidTill =
      paidTill !== undefined
        ? normalizeDate(paidTill)
        : normalizeDate(payment.paidTill);

    if (paidTill !== undefined && paidTill && !resolvedPaidTill) {
      return res.status(400).json({ msg: "paidTill is not a valid date" });
    }

    const effectivePaidTill =
      resolvedPaidTill || buildPaidTillFromPlan(effectiveMembershipStartDate, student.plan);

    if (!effectivePaidTill) {
      return res.status(400).json({ msg: "paidTill is required when the student's plan has no month duration" });
    }

    if (method !== undefined) {
      const normalizedMethod = normalizeMethod(method);

      if (!normalizedMethod) {
        return res.status(400).json({ msg: "method is invalid" });
      }

      payment.method = normalizedMethod;
    }

    payment.studentId = student._id;
    payment.membershipStartDate = effectiveMembershipStartDate;
    payment.paidTill = effectivePaidTill;

    if (notes !== undefined) {
      payment.notes = notes ? String(notes).trim() : "";
    }

    await payment.save();

    await syncStudentFromLatestPayment(student._id, req.user.libraryId);

    if (previousStudentId !== String(student._id)) {
      await syncStudentFromLatestPayment(previousStudentId, req.user.libraryId);
    }

    const updatedPayment = await Payment.findById(payment._id).populate(
      "studentId",
      "memberId name phone hallName seatNumber shift plan status"
    );

    return res.json(updatedPayment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: "Payment id must be a valid id" });
    }

    const payment = await Payment.findOne({
      _id: id,
      libraryId: req.user.libraryId
    });

    if (!payment) {
      return res.status(404).json({ msg: "Payment not found" });
    }

    const studentId = payment.studentId;

    await payment.deleteOne();
    await syncStudentFromLatestPayment(studentId, req.user.libraryId);

    return res.json({ msg: "Payment deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
