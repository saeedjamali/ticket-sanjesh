import mongoose from "mongoose";
require("./Province");
require("./District");
console.log("Initializing Announcement model");

// Check mongoose connection
if (!mongoose.connection || mongoose.connection.readyState !== 1) {
  console.log(
    "Warning: Mongoose is not connected when loading Announcement model"
  );
}

const AnnouncementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    default: null,
  },
  priority: {
    type: String,
    enum: ["high", "medium", "low"], // آنی، فوری، عادی
    default: "low",
  },
  targetRoles: {
    type: [String],
    enum: [
      "districtEducationExpert", // کارشناس سنجش منطقه
      "districtTechExpert", // کارشناس فناوری منطقه
      "districtEvalExpert", // کارشناس ارزیابی منطقه
      "examCenterManager", // مدیر واحد سازمانی
      "transferApplicant", // پرسنل
      "provinceEvalExpert", // کارشناس سنجش استان
      "districtEvalExpert", // کارشناس سنجش منطقه
      "provinceTechExpert", // کارشناس فناوری استان
      "districtTechExpert", // کارشناس فناوری منطقه
      "provinceRegistrationExpert", // کارشناس ثبت نام استان
      "districtRegistrationExpert", // کارشناس ثبت نام منطقه
    ],
    required: true,
  },
  targetDistricts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "District",
    },
  ],
  // New fields for exam center filtering
  targetGender: {
    type: String,
    enum: ["دختر", "پسر", "مختلط"],
    default: null,
  },
  targetPeriod: {
    type: String,
    enum: [
      "ابتدایی",
      "متوسطه اول",
      "متوسطه دوم فنی",
      "متوسطه دوم کاردانش",
      "متوسطه دوم نظری",
    ],
    default: null,
  },
  targetOrganizationType: {
    type: String,
    enum: ["دولتی", "غیردولتی"],
    default: null,
  },
  province: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Province",
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdByRole: {
    type: String,
    enum: [
      "generalManager", // مدیر کل
      "provinceEducationExpert", // کارشناس سنجش استان
      "provinceTechExpert", // کارشناس فناوری استان
      "provinceEvalExpert", // کارشناس ارزیابی استان
    ],
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "archived"],
    default: "active",
  },
  viewedBy: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      viewedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware to update the 'updatedAt' field on update
AnnouncementSchema.pre("findOneAndUpdate", function () {
  this.set({ updatedAt: Date.now() });
});

// Check if model exists already to prevent overwrite during hot reload
const AnnouncementModel =
  mongoose.models?.Announcement ||
  mongoose.model("Announcement", AnnouncementSchema);

console.log("Announcement model initialized:", !!AnnouncementModel);

export default AnnouncementModel;
