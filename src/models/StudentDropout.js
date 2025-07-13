import mongoose from "mongoose";

const studentDropoutSchema = new mongoose.Schema(
  {
    // اطلاعات دانش‌آموز
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    nationalId: {
      type: String,
      required: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    fatherName: {
      type: String,
      required: true,
      trim: true,
    },

    // اطلاعات تحصیلی سال قبل
    previousAcademicYear: {
      type: String,
      required: true,
    },
    previousExamCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamCenter",
      required: true,
    },
    previousGrade: {
      type: String,
      required: true,
    },
    previousField: {
      type: String,
      required: true,
    },

    // علت بازمانده
    dropoutReason: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DropoutReason",
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // اطلاعات ثبت کننده
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // وضعیت
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending",
    },

    // تاریخ ثبت علت
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index برای بهبود عملکرد
studentDropoutSchema.index({ studentId: 1 });
studentDropoutSchema.index({ nationalId: 1 });
studentDropoutSchema.index({ previousExamCenter: 1, previousAcademicYear: 1 });
studentDropoutSchema.index({ dropoutReason: 1 });
studentDropoutSchema.index({ status: 1 });

// جلوگیری از ثبت تکراری برای یک دانش‌آموز در یک سال
studentDropoutSchema.index(
  {
    studentId: 1,
    previousAcademicYear: 1,
  },
  { unique: true }
);

const StudentDropout =
  mongoose.models.StudentDropout ||
  mongoose.model("StudentDropout", studentDropoutSchema);

export default StudentDropout;
