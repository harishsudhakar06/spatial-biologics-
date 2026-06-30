const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/chemvault";

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI environment variable is not set!");
    console.error("   Authentication requires MongoDB. Please set MONGO_URI in your .env file.");
    console.error("   Example: MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/chemvault");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log("✅ MongoDB connected:", MONGO_URI.replace(/:[^:@]+@/, ":****@"));
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    console.error("   Authentication requires MongoDB. Server cannot start without database connection.");
    console.error("   Please check your MONGO_URI and ensure MongoDB is accessible.");
    process.exit(1);
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
