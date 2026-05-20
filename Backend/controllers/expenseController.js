const Expense = require("../models/Expense");
const { buildRangeMatch } = require("../utils/dateRange");

const normalizeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseLimit = (value) => {
  const numericLimit = Number(value);

  if (!Number.isInteger(numericLimit) || numericLimit <= 0) {
    return null;
  }

  return Math.min(numericLimit, 200);
};

exports.addExpense = async (req, res) => {
  try {
    const { title, amount, category, expenseDate, notes } = req.body;

    if (!title || amount === undefined) {
      return res.status(400).json({ msg: "title and amount are required" });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ msg: "amount must be a positive number" });
    }

    const normalizedExpenseDate = normalizeDate(expenseDate) || new Date();

    if (expenseDate && !normalizeDate(expenseDate)) {
      return res.status(400).json({ msg: "expenseDate is not a valid date" });
    }

    const expense = await Expense.create({
      libraryId: req.user.libraryId,
      title: title.trim(),
      amount: numericAmount,
      category: category ? category.trim().toUpperCase() : "GENERAL",
      expenseDate: normalizedExpenseDate,
      notes: notes ? notes.trim() : ""
    });

    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const { search, category, year, month, sort = "latest", limit } = req.query;
    const rangeResult = buildRangeMatch(year, month, "expenseDate");

    if (rangeResult.error) {
      return res.status(400).json({ msg: rangeResult.error });
    }

    const query = {
      libraryId: req.user.libraryId,
      ...rangeResult.match
    };

    if (category) {
      query.category = category.trim().toUpperCase();
    }

    if (search) {
      const trimmedSearch = search.trim();
      query.$or = [
        { title: { $regex: trimmedSearch, $options: "i" } },
        { notes: { $regex: trimmedSearch, $options: "i" } },
        { category: { $regex: trimmedSearch, $options: "i" } }
      ];
    }

    const sortMap = {
      latest: { expenseDate: -1, createdAt: -1 },
      oldest: { expenseDate: 1, createdAt: 1 },
      amountHigh: { amount: -1, expenseDate: -1 },
      amountLow: { amount: 1, expenseDate: -1 }
    };

    const queryBuilder = Expense.find(query).sort(sortMap[sort] || sortMap.latest).lean();
    const resolvedLimit = parseLimit(limit);

    if (resolvedLimit) {
      queryBuilder.limit(resolvedLimit);
    }

    const expenses = await queryBuilder;
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
