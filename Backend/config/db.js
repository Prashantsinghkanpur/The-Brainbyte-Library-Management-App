const mongoose = require("mongoose");

const dropLegacyUniqueSeatIndex = async () => {
  try {
    const collection = mongoose.connection.collection("students");
    const indexes = await collection.indexes();
    const legacySeatIndex = indexes.find(
      (index) =>
        index.unique &&
        index.key?.libraryId === 1 &&
        index.key?.hallName === 1 &&
        index.key?.seatNumber === 1
    );

    if (legacySeatIndex) {
      await collection.dropIndex(legacySeatIndex.name);
      console.log("Dropped legacy unique student seat index");
    }
  } catch (err) {
    console.log("Seat index migration skipped:", err.message);
  }
};

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  await mongoose.connect(mongoUri);
  await dropLegacyUniqueSeatIndex();
  console.log("MongoDB Connected");
};

module.exports = connectDB;
