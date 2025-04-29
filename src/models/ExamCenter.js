import mongoose from "mongoose";

const examCenterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "نام مرکز آزمون الزامی است"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "کد مرکز آزمون الزامی است"],
      unique: true,
      trim: true,
    },
    district: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "District",
      required: [true, "منطقه مرکز آزمون الزامی است"],
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    capacity: {
      type: Number,
      min: [1, "ظرفیت مرکز آزمون باید حداقل 1 نفر باشد"],
    },
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
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

// متد استاتیک برای بررسی وجود مرکز آزمون با کد مشخص
examCenterSchema.statics.findByCode = async function (code) {
  return this.findOne({ code: code.trim() });
};

// متد برای بررسی اینکه آیا مرکز آزمون در استان مشخصی قرار دارد
examCenterSchema.methods.isInProvince = async function (provinceId) {
  await this.populate({
    path: "district",
    populate: { path: "province" },
  });
  return this.district.province._id.toString() === provinceId.toString();
};

// متد برای بررسی اینکه آیا مرکز آزمون در منطقه مشخصی قرار دارد
examCenterSchema.methods.isInDistrict = function (districtId) {
  return this.district.toString() === districtId.toString();
};

const ExamCenter =
  mongoose.models?.ExamCenter || mongoose.model("ExamCenter", examCenterSchema);

export default ExamCenter;
