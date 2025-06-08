// Script to list users in the database
require("dotenv").config({ path: ".env.local" });

const mongoose = require("mongoose");

// Database connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ticket-system";

console.log("Connecting to MongoDB at:", MONGODB_URI);

// User schema (copied from model to ensure script can run standalone)
const UserSchema = new mongoose.Schema({
  nationalId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: [
      "systemAdmin", // مدیر سیستم
      "generalManager", // مدیر کل
      "provinceEducationExpert", // کارشناس سنجش استان
      "provinceTechExpert", // کارشناس فناوری استان
      "districtEducationExpert", // کارشناس سنجش منطقه
      "districtTechExpert", // کارشناس فناوری منطقه
      "examCenterManager", // مدیر واحد سازمانی
    ],
    required: true,
  },
  province: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Province",
  },
  district: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "District",
  },
  examCenter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ExamCenter",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  academicYear: {
    type: String,
  },
});

// List all users
async function listUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Create User model
    const User = mongoose.models.User || mongoose.model("User", UserSchema);

    // Find all users
    const users = await User.find({});

    console.log("Total users:", users.length);

    // Display each user
    users.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log(`Full Name: ${user.fullName}`);
      console.log(`National ID: ${user.nationalId}`);
      console.log(`Role: ${user.role}`);
      console.log(`Created At: ${user.createdAt}`);
    });

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error listing users:", error);
    process.exit(1);
  }
}

// Run the script
listUsers();
