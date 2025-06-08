// Script to initialize the database with a system administrator user
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

// Initialize database with admin user
async function initDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Create User model
    const User = mongoose.models.User || mongoose.model("User", UserSchema);

    // Check if admin already exists
    const adminExists = await User.findOne({ role: "systemAdmin" });

    if (adminExists) {
      console.log("Admin user already exists");
    } else {
      // Create admin user
      const adminPassword = process.env.ADMIN_PASSWORD || "admin123456";
      // const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const adminUser = new User({
        nationalId: "1111111111", // Default national ID for admin
        password: hashedPassword,
        fullName: "مدیر سیستم",
        role: "systemAdmin",
      });

      await adminUser.save();
      console.log("Admin user created successfully");
      console.log("National ID: 1111111111");
      console.log(`Password: ${adminPassword}`);
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");

    console.log("Initialization complete");
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
}

// Run the initialization
initDatabase();
