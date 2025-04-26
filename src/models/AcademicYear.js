import mongoose from "mongoose";

const AcademicYearSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "نام سال تحصیلی الزامی است"],
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          // اعتبارسنجی فرمت سال تحصیلی (مثال: 1402-1403)
          return /^\d{4}-\d{4}$/.test(v);
        },
        message: (props) =>
          `${props.value} یک سال تحصیلی معتبر نیست. فرمت صحیح: 1402-1403`,
      },
    },
    isActive: {
      type: Boolean,
      default: false,
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

// ایجاد ایندکس برای فیلد name
AcademicYearSchema.index({ name: 1 }, { unique: true });

// میدل‌ور برای پر کردن خودکار updatedAt
AcademicYearSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

// حذف ایندکس قدیمی year در صورت وجود
const AcademicYear =
  mongoose.models.AcademicYear ||
  mongoose.model("AcademicYear", AcademicYearSchema);

// تلاش برای حذف ایندکس قدیمی
if (mongoose.connection.readyState === 1) {
  AcademicYear.collection.dropIndex("year_1").catch((err) => {
    // اگر ایندکس وجود نداشته باشد، خطا را نادیده می‌گیریم
    if (err.code !== 27) {
      console.error("Error dropping old index:", err);
    }
  });
}

export default AcademicYear;
