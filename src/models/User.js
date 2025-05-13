import mongoose from "mongoose";
import bcrypt from "bcryptjs";
require("./Province");
require("./District");
require("./ExamCenter");
console.log("Initializing User model");

// Check mongoose connection
if (!mongoose.connection || mongoose.connection.readyState !== 1) {
  console.log("Warning: Mongoose is not connected when loading User model");
}

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
  phone: {
    type: String,
    trim: true,
    sparse: true,
  },
  phoneVerified: {
    type: Boolean,
    default: false,
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
  isActive: {
    type: Boolean,
    default: true,
  },
  refreshToken: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  academicYear: {
    type: String,
  },
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Check if model exists already to prevent overwrite during hot reload
const UserModel = mongoose.models?.User || mongoose.model("User", UserSchema);

export default UserModel;
