const mongoose = require("mongoose");
const dns = require("dns");

const connectDb = async () => {
  let uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn(
      "⚠️  MONGO_URI is not defined in server/.env. Database features will be disabled until configured."
    );
    return false;
  }

  // Sanitize URI: remove surrounding quotes, whitespace, and trailing semicolons
  uri = uri.trim().replace(/^["']|["'];?$/g, "").replace(/;+$/, "").trim();

  // If using MongoDB Atlas SRV URI, use reliable public DNS resolvers on Windows
  if (uri.startsWith("mongodb+srv://")) {
    try {
      dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
    } catch {
      // Ignore if system restricts DNS overrides
    }
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`✅ MongoDB connected successfully: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    console.warn(
      "💡 Tip: Ensure MongoDB is running locally or check your MONGO_URI in server/.env."
    );
    return false;
  }
};

const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = { connectDb, isDbConnected };