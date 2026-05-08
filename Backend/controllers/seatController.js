const Hall = require("../models/Hall");
const Student = require("../models/student");
const Library = require("../models/Library");

const normalizeName = (value) => value.trim();

const getDuesState = (student) => {
  if (!student.paidTill) {
    return "UNPAID";
  }

  const endDate = new Date(student.paidTill);
  endDate.setHours(23, 59, 59, 999);

  return endDate >= new Date() ? "PAID" : "UNPAID";
};

const getDaysRemaining = (paidTill) => {
  if (!paidTill) return 0;

  const target = new Date(paidTill);
  target.setHours(23, 59, 59, 999);

  const diffMs = target.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

const ensureHallCanHoldSeat = async (libraryId, hallName, seatNumber) => {
  const hall = await Hall.findOne({ libraryId, name: hallName });

  if (!hall) {
    return Hall.create({
      libraryId,
      name: hallName,
      totalSeats: seatNumber
    });
  }

  if (hall.totalSeats < seatNumber) {
    hall.totalSeats = seatNumber;
    await hall.save();
  }

  return hall;
};

exports.ensureHallCapacity = ensureHallCanHoldSeat;

const ensureLibrarySeatsVisible = async (libraryId, halls) => {
  const library = await Library.findById(libraryId);
  const librarySeatCount = Number(library?.seatCount || 0);

  if (librarySeatCount <= 0) {
    return halls;
  }

  if (halls.length === 0) {
    const mainHall = await Hall.create({
      libraryId,
      name: "Main Hall",
      totalSeats: librarySeatCount
    });

    return [mainHall];
  }

  const totalHallSeats = halls.reduce((sum, hall) => sum + Number(hall.totalSeats || 0), 0);

  if (totalHallSeats >= librarySeatCount) {
    return halls;
  }

  const mainHall = halls.find((hall) => hall.name === "Main Hall") || halls[0];
  mainHall.totalSeats += librarySeatCount - totalHallSeats;
  await mainHall.save();

  return halls.map((hall) => (
    hall._id.toString() === mainHall._id.toString() ? mainHall : hall
  ));
};

exports.createHall = async (req, res) => {
  try {
    const { name, totalSeats } = req.body;

    if (!name || totalSeats === undefined) {
      return res.status(400).json({ msg: "name and totalSeats are required" });
    }

    const numericTotalSeats = Number(totalSeats);

    if (!Number.isInteger(numericTotalSeats) || numericTotalSeats <= 0) {
      return res.status(400).json({ msg: "totalSeats must be a positive number" });
    }

    const hall = await Hall.create({
      libraryId: req.user.libraryId,
      name: normalizeName(name),
      totalSeats: numericTotalSeats
    });

    res.status(201).json(hall);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ msg: "Hall name already exists" });
    }

    res.status(500).json({ error: err.message });
  }
};

exports.getHalls = async (req, res) => {
  try {
    const halls = await Hall.find({
      libraryId: req.user.libraryId,
      isActive: true
    }).sort({ createdAt: 1 });

    res.json(halls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateHall = async (req, res) => {
  try {
    const hall = await Hall.findOne({
      _id: req.params.id,
      libraryId: req.user.libraryId
    });

    if (!hall) {
      return res.status(404).json({ msg: "Hall not found" });
    }

    const { name, totalSeats } = req.body;
    const originalHallName = hall.name;
    const nextHallName = name !== undefined ? normalizeName(name) : hall.name;
    const originalTotalSeats = hall.totalSeats;

    if (totalSeats !== undefined) {
      const numericTotalSeats = Number(totalSeats);

      if (!Number.isInteger(numericTotalSeats) || numericTotalSeats <= 0) {
        return res.status(400).json({ msg: "totalSeats must be a positive number" });
      }

      const occupiedCount = await Student.countDocuments({
        libraryId: req.user.libraryId,
        hallName: originalHallName
      });

      if (numericTotalSeats < occupiedCount) {
        return res.status(400).json({
          msg: "totalSeats cannot be less than the number of occupied seats"
        });
      }

      hall.totalSeats = numericTotalSeats;
    }

    hall.name = nextHallName;
    try {
      await hall.save();

      if (nextHallName !== originalHallName) {
        await Student.updateMany(
          {
            libraryId: req.user.libraryId,
            hallName: originalHallName
          },
          {
            $set: { hallName: nextHallName }
          }
        );
      }
    } catch (err) {
      hall.name = originalHallName;
      hall.totalSeats = originalTotalSeats;

      try {
        await hall.save();
      } catch (rollbackError) {
        console.log("Hall rollback failed:", rollbackError.message);
      }

      throw err;
    }

    res.json(hall);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ msg: "Hall name already exists" });
    }

    res.status(500).json({ error: err.message });
  }
};

exports.deleteHall = async (req, res) => {
  try {
    const hall = await Hall.findOne({
      _id: req.params.id,
      libraryId: req.user.libraryId
    });

    if (!hall) {
      return res.status(404).json({ msg: "Hall not found" });
    }

    const assignedStudents = await Student.countDocuments({
      libraryId: req.user.libraryId,
      hallName: hall.name
    });

    if (assignedStudents > 0) {
      return res.status(400).json({ msg: "Cannot delete a hall with assigned students" });
    }

    await hall.deleteOne();
    res.json({ msg: "Hall deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSeatGrid = async (req, res) => {
  try {
    const {
      hallName,
      shift = "ALL",
      status = "ALL",
      dues = "ALL",
      search
    } = req.query;

    let halls = await Hall.find({
      libraryId: req.user.libraryId,
      isActive: true
    }).sort({ createdAt: 1 });

    halls = await ensureLibrarySeatsVisible(req.user.libraryId, halls);

    const selectedHall =
      halls.find((hall) => hall.name === hallName) ||
      halls[0] ||
      null;

    const allStudents = await Student.find({
      libraryId: req.user.libraryId
    }).sort({ hallName: 1, seatNumber: 1 });

    const totalSeats = halls.reduce((sum, hall) => sum + hall.totalSeats, 0);
    const filledSeats = allStudents.length;

    if (!selectedHall) {
      return res.json({
        summary: {
          filledSeats,
          vacantSeats: Math.max(0, totalSeats - filledSeats),
          totalStudents: allStudents.length,
          totalSeats
        },
        halls: [],
        selectedHall: null,
        seats: []
      });
    }

    const selectedStudents = allStudents.filter(
      (student) => student.hallName === selectedHall.name
    );

    const studentMap = new Map(
      selectedStudents.map((student) => [student.seatNumber, student])
    );

    const normalizedSearch = search ? search.trim().toLowerCase() : "";
    const seats = [];

    for (let seatNumber = 1; seatNumber <= selectedHall.totalSeats; seatNumber += 1) {
      const student = studentMap.get(seatNumber) || null;
      const occupancyStatus = student ? "OCCUPIED" : "VACANT";
      const duesState = student ? getDuesState(student) : null;

      if (status !== "ALL" && occupancyStatus !== status.toUpperCase()) {
        continue;
      }

      if (shift !== "ALL" && student && student.shift !== shift.toUpperCase()) {
        continue;
      }

      if (dues !== "ALL") {
        if (dues.toUpperCase() === "TRIAL") {
          if (!student || student.plan.toUpperCase() !== "TRIAL") {
            continue;
          }
        } else if (!student || duesState !== dues.toUpperCase()) {
          continue;
        }
      }

      if (normalizedSearch) {
        const searchText = student
          ? `${student.name} ${student.memberId} ${student.seatNumber}`.toLowerCase()
          : `${seatNumber}`;

        if (!searchText.includes(normalizedSearch)) {
          continue;
        }
      }

      seats.push({
        seatNumber,
        hallName: selectedHall.name,
        occupancyStatus,
        student: student ? {
          id: student._id,
          memberId: student.memberId,
          name: student.name,
          shift: student.shift,
          status: student.status,
          duesState,
          daysRemaining: getDaysRemaining(student.paidTill)
        } : null
      });
    }

    res.json({
      summary: {
        filledSeats,
        vacantSeats: Math.max(0, totalSeats - filledSeats),
        totalStudents: allStudents.length,
        totalSeats
      },
      halls,
      selectedHall,
      seats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
