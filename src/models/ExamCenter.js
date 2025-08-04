import mongoose from "mongoose";
import "./Gender";
import "./CourseGrade";
import "./CourseBranchField";
import "./OrganizationalUnitType";

const examCenterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "نام واحد سازمانی الزامی است"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "کد واحد سازمانی الزامی است"],
      unique: true,
      trim: true,
    },
    district: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "District",
      required: [true, "منطقه واحد سازمانی الزامی است"],
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    capacity: {
      type: Number,
      min: [1, "ظرفیت واحد سازمانی باید حداقل 1 نفر باشد"],
    },
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    gender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gender",
      required: [true, "جنسیت الزامی است"],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseGrade",
      required: [true, "دوره الزامی است"],
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseBranchField",
      required: [true, "شاخه الزامی است"],
    },
    studentCount: {
      type: Number,
      min: [0, "تعداد دانش آموز نمی‌تواند منفی باشد"],
    },
    organizationType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrganizationalUnitType",
      required: [true, "نوع واحد سازمانی الزامی است"],
    },
    geographicalLocation: {
      type: String,
      enum: {
        values: ["شهری", "روستایی", "خارج کشور"],
        message:
          "موقعیت جغرافیایی باید یکی از مقادیر شهری، روستایی یا خارج کشور باشد",
      },
      required: [true, "موقعیت جغرافیایی الزامی است"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// میدل‌ور برای پر کردن خودکار updatedAt
examCenterSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

// متد استاتیک برای بررسی وجود واحد سازمانی با کد مشخص
examCenterSchema.statics.findByCode = async function (code) {
  return this.findOne({ code: code.trim() });
};

// متد برای بررسی اینکه آیا واحد سازمانی در استان مشخصی قرار دارد
examCenterSchema.methods.isInProvince = async function (provinceId) {
  await this.populate({
    path: "district",
    populate: { path: "province" },
  });
  return this.district.province._id.toString() === provinceId.toString();
};

// متد برای بررسی اینکه آیا واحد سازمانی در منطقه مشخصی قرار دارد
examCenterSchema.methods.isInDistrict = function (districtId) {
  return this.district.toString() === districtId.toString();
};

const ExamCenter =
  mongoose.models?.ExamCenter || mongoose.model("ExamCenter", examCenterSchema);

export default ExamCenter;
