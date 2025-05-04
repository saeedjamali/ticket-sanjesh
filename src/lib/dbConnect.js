import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ticket-system";

// این متغیر برای جلوگیری از اتصال‌های تکراری است
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  console.log("dbConnect function called");
  if (cached.conn) {
    console.log("Using cached database connection");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    };

    mongoose.set("strictQuery", false);

    try {
      console.log("Connecting to MongoDB...");
      cached.promise = await mongoose
        .connect(MONGODB_URI, opts)
        .then((mongoose) => {
          console.log("New database connection established");
          return mongoose;
        });
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      cached.promise = null;
      throw error;
    }
  } else {
    console.log("Using existing database connection promise");
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error("Error resolving database connection:", error);
    cached.promise = null;
    throw error;
  }
}

// اضافه کردن event listeners برای مانیتورینگ اتصال
mongoose.connection.on("connected", () => {
  console.log("MongoDB connected successfully");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  process.exit(0);
});

export default dbConnect;
