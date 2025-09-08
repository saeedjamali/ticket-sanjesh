const MONGODB_URI =
  // process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ticket-system";
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ticket-system";

const opts = {
  bufferCommands: false,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
};

if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  try {
    if (global.mongoose.conn) {
      return global.mongoose.conn;
    }

    if (!global.mongoose.promise) {
      const mongoose = (await import("mongoose")).default;
      global.mongoose.promise = mongoose.connect(MONGODB_URI, opts);
    }

    global.mongoose.conn = await global.mongoose.promise;
    return global.mongoose.conn;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    global.mongoose.promise = null;
    global.mongoose.conn = null;
    throw error;
  }
}

// Test the connection immediately
connectDB()
  .then(() => console.log("Initial connection test successful"))
  .catch((error) => console.error("Initial connection test failed:", error));

export default connectDB;
