const getMonthRange = (year, month) => {
  if (!year || !month) return null;

  const numericYear = Number(year);
  const numericMonth = Number(month);

  if (!Number.isInteger(numericYear) || !Number.isInteger(numericMonth)) {
    return null;
  }

  if (numericMonth < 1 || numericMonth > 12) {
    return null;
  }

  const start = new Date(numericYear, numericMonth - 1, 1);
  const end = new Date(numericYear, numericMonth, 1);

  return { start, end };
};

const getYearRange = (year) => {
  if (!year) return null;

  const numericYear = Number(year);

  if (!Number.isInteger(numericYear)) {
    return null;
  }

  return {
    start: new Date(numericYear, 0, 1),
    end: new Date(numericYear + 1, 0, 1)
  };
};

const buildRangeMatch = (year, month, dateField) => {
  const monthRange = getMonthRange(year, month);
  const yearRange = getYearRange(year);

  if (month && !year) {
    return { error: "year is required when month is provided" };
  }

  if (monthRange) {
    return {
      match: {
        [dateField]: { $gte: monthRange.start, $lt: monthRange.end }
      },
      monthRange
    };
  }

  if (year) {
    if (!yearRange) {
      return { error: "year must be a valid number" };
    }

    return {
      match: {
        [dateField]: { $gte: yearRange.start, $lt: yearRange.end }
      },
      yearRange
    };
  }

  return { match: {} };
};

module.exports = {
  getMonthRange,
  getYearRange,
  buildRangeMatch
};
