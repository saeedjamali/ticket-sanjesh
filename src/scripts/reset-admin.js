// Script to reset admin password
require("dotenv").config({ path: ".env.local" });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
      "examCenterManager", // مسئول مرکز آزمون
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

// Reset admin password
async function resetAdminPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Create User model
    const User = mongoose.models.User || mongoose.model("User", UserSchema);

    // Find admin user
    const adminUser = await User.findOne({ role: "systemAdmin" });

    if (!adminUser) {
      console.log("Admin user not found");
      process.exit(1);
    }

    // Reset password
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123456";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Update admin user
    adminUser.password = hashedPassword;
    await adminUser.save();

    console.log("Admin password reset successfully");
    console.log("National ID:", adminUser.nationalId);
    console.log("Password:", adminPassword);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error resetting admin password:", error);
    process.exit(1);
  }
}

// Run the script
resetAdminPassword();
