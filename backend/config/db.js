const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/chemvault";

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  try {
    await mongoose.connect(MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log("✅ MongoDB connected:", MONGO_URI);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    console.log("   Falling back to JSON file storage");
    isConnected = false;
  }

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB error:", err.message);
    isConnected = false;
  });

  mongoose.connection.on("disconnected", () => {
    console.log("MongoDB disconnected");
    isConnected = false;
  });
}

function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isMongoConnected };
