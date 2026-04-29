const Payment = require("../models/payment");
const Expense = require("../models/Expense");
const Student = require("../models/student");
const mongoose = require("mongoose");
const { buildRangeMatch } = require("../utils/dateRange");

const sumAmount = async (Model, match) => {
  const [result] = await Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    total: result?.total || 0,
    count: result?.count || 0
  };
};

exports.getAnalyticsSummary = async (req, res) => {
  try {
    const { year, month } = req.query;
    const paymentRange = buildRangeMatch(year, month, "paymentDate");
    const expenseRange = buildRangeMatch(year, month, "expenseDate");

    if (paymentRange.error) {
      return res.status(400).json({ msg: paymentRange.error });
    }

    if (expenseRange.error) {
      return res.status(400).json({ msg: expenseRange.error });
    }

    const paymentMatch = {
      libraryId: new mongoose.Types.ObjectId(req.user.libraryId),
      ...paymentRange.match
    };

    const expenseMatch = {
      libraryId: new mongoose.Types.ObjectId(req.user.libraryId),
      ...expenseRange.match
    };

    const [paymentTotals, expenseTotals, students] = await Promise.all([
      sumAmount(Payment, paymentMatch),
      sumAmount(Expense, expenseMatch),
      Student.find({ libraryId: req.user.libraryId })
    ]);

    const totalDues = students.reduce((sum, student) => {
      const feeAmount =
        Number.isFinite(student.feeAmount) && student.feeAmount > 0
          ? student.feeAmount
          : Number(student.plan);
      const isInactive = student.status !== "ACTIVE";

      if (!isInactive || !Number.isFinite(feeAmount) || feeAmount <= 0) {
        return sum;
      }

      return sum + feeAmount;
    }, 0);

    const pendingStudents = students.filter((student) => student.status !== "ACTIVE").length;

    res.json({
      monthlyRevenue: paymentTotals.total,
      monthlyRevenueTransactions: paymentTotals.count,
      monthlyExpenses: expenseTotals.total,
      expenseTransactions: expenseTotals.count,
      totalDues,
      pendingStudents,
      netProfit: paymentTotals.total - expenseTotals.total,
      totalStudents: students.length,
      activeStudents: students.filter((student) => student.status === "ACTIVE").length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
