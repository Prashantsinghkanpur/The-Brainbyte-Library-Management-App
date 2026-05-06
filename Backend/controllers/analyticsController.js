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

const sumByMethod = async (match) => {
  const rows = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$method",
        total: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    }
  ]);

  return rows.reduce((acc, row) => {
    acc[row._id || "OTHER"] = {
      total: row.total || 0,
      count: row.count || 0
    };
    return acc;
  }, {});
};

const buildDayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

const buildYearRange = (year) => {
  const numericYear = Number(year) || new Date().getFullYear();
  return {
    start: new Date(numericYear, 0, 1),
    end: new Date(numericYear + 1, 0, 1)
  };
};

const getMonthlyTrend = async (libraryId, year) => {
  const { start, end } = buildYearRange(year);
  const baseMatch = {
    libraryId: new mongoose.Types.ObjectId(libraryId)
  };

  const [revenueRows, expenseRows] = await Promise.all([
    Payment.aggregate([
      {
        $match: {
          ...baseMatch,
          paymentDate: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: { $month: "$paymentDate" },
          total: { $sum: "$amount" }
        }
      }
    ]),
    Expense.aggregate([
      {
        $match: {
          ...baseMatch,
          expenseDate: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: { $month: "$expenseDate" },
          total: { $sum: "$amount" }
        }
      }
    ])
  ]);

  const revenueMap = new Map(revenueRows.map((row) => [row._id, row.total]));
  const expenseMap = new Map(expenseRows.map((row) => [row._id, row.total]));

  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    revenue: revenueMap.get(index + 1) || 0,
    expenses: expenseMap.get(index + 1) || 0
  }));
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

    const selectedYear = year || new Date().getFullYear();
    const todayRange = buildDayRange();
    const annualRange = buildYearRange(selectedYear);

    const todayPaymentMatch = {
      libraryId: new mongoose.Types.ObjectId(req.user.libraryId),
      paymentDate: { $gte: todayRange.start, $lt: todayRange.end }
    };

    const annualPaymentMatch = {
      libraryId: new mongoose.Types.ObjectId(req.user.libraryId),
      paymentDate: { $gte: annualRange.start, $lt: annualRange.end }
    };

    const annualExpenseMatch = {
      libraryId: new mongoose.Types.ObjectId(req.user.libraryId),
      expenseDate: { $gte: annualRange.start, $lt: annualRange.end }
    };

    const [
      paymentTotals,
      expenseTotals,
      students,
      todayPaymentTotals,
      todayMethods,
      monthlyMethods,
      annualPaymentTotals,
      annualExpenseTotals,
      monthlyTrend
    ] = await Promise.all([
      sumAmount(Payment, paymentMatch),
      sumAmount(Expense, expenseMatch),
      Student.find({ libraryId: req.user.libraryId }),
      sumAmount(Payment, todayPaymentMatch),
      sumByMethod(todayPaymentMatch),
      sumByMethod(paymentMatch),
      sumAmount(Payment, annualPaymentMatch),
      sumAmount(Expense, annualExpenseMatch),
      getMonthlyTrend(req.user.libraryId, selectedYear)
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
      monthlyMethods,
      monthlyExpenses: expenseTotals.total,
      expenseTransactions: expenseTotals.count,
      todayRevenue: todayPaymentTotals.total,
      todayRevenueTransactions: todayPaymentTotals.count,
      todayMethods,
      annualRevenue: annualPaymentTotals.total,
      annualRevenueTransactions: annualPaymentTotals.count,
      annualExpenses: annualExpenseTotals.total,
      annualExpenseTransactions: annualExpenseTotals.count,
      annualNetProfit: annualPaymentTotals.total - annualExpenseTotals.total,
      monthlyTrend,
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
