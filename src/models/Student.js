import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    nationalId: {
      type: String,
      required: [true, "کد ملی الزامی است"],
      trim: true,
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: "کد ملی باید 10 رقم باشد",
      },
    },
    firstName: {
      type: String,
      required: [true, "نام الزامی است"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "نام خانوادگی الزامی است"],
      trim: true,
    },
    fatherName: {
      type: String,
      required: [true, "نام پدر الزامی است"],
      trim: true,
    },
    birthDate: {
      type: String,
      required: [true, "تاریخ تولد الزامی است"],
      trim: true,
    },
    gender: {
      type: String,
      required: [true, "جنسیت الزامی است"],
      enum: {
        values: ["male", "female"],
        message: "جنسیت باید پسر یا دختر باشد",
      },
    },
    nationality: {
      type: String,
      default: "ایرانی",
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || /^09\d{9}$/.test(v);
        },
        message: "شماره موبایل نامعتبر است",
      },
    },
    address: {
      type: String,
      trim: true,
    },
    academicCourse: {
      type: String,
      required: [true, "دوره تحصیلی الزامی است"],
      trim: true,
    },
    gradeCode: {
      type: String,
      required: [true, "پایه تحصیلی الزامی است"],
      trim: true,
    },
    fieldCode: {
      type: String,
      required: [true, "رشته تحصیلی الزامی است"],
      trim: true,
    },
    studentType: {
      type: String,
      required: [true, "نوع دانش‌آموز الزامی است"],
      enum: {
        values: ["normal", "adult"],
        message: "نوع دانش‌آموز نامعتبر است",
      },
      default: "normal",
    },
    districtCode: {
      type: String,
      required: [true, "کد منطقه الزامی است"],
      trim: true,
    },
    provinceCode: {
      type: String,
      trim: true,
    },
    organizationalUnitCode: {
      type: String,
      required: [true, "کد واحد سازمانی الزامی است"],
      trim: true,
    },
    academicYear: {
      type: String,
      required: [true, "سال تحصیلی الزامی است"],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "ایجاد کننده الزامی است"],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// ایجاد index مرکب برای جلوگیری از تکرار کد ملی در یک سال تحصیلی
studentSchema.index({ nationalId: 1, academicYear: 1 }, { unique: true });

// Index برای جستجو و فیلتر
studentSchema.index({ organizationalUnitCode: 1 });
studentSchema.index({ districtCode: 1 });
studentSchema.index({ provinceCode: 1 });
studentSchema.index({ firstName: 1 });
studentSchema.index({ lastName: 1 });
studentSchema.index({ gradeCode: 1 });
studentSchema.index({ fieldCode: 1 });
studentSchema.index({ gender: 1 });

// Virtual برای نام کامل
studentSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// متد استاتیک برای جستجو
studentSchema.statics.findByOrganizationalUnit = function (unitCode) {
  return this.find({ organizationalUnitCode: unitCode, isActive: true });
};

// متد استاتیک برای شمارش دانش‌آموزان یک واحد سازمانی
studentSchema.statics.countByOrganizationalUnit = function (unitCode) {
  return this.countDocuments({
    organizationalUnitCode: unitCode,
    isActive: true,
  });
};

const Student =
  mongoose.models?.Student || mongoose.model("Student", studentSchema);

export default Student;
