import mongoose from "mongoose";

const courseGradeSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: true,
      trim: true,
    },
    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    gradeCode: {
      type: String,
      required: true,
      trim: true,
    },
    gradeName: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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

// ایجاد ایندکس ترکیبی برای جلوگیری از تکرار
courseGradeSchema.index({ courseCode: 1, gradeCode: 1 }, { unique: true });

// ایندکس‌های جستجو
courseGradeSchema.index({ courseCode: 1 });
courseGradeSchema.index({ gradeCode: 1 });
courseGradeSchema.index({ isActive: 1 });

const CourseGrade =
  mongoose.models?.CourseGrade ||
  mongoose.model("CourseGrade", courseGradeSchema);

export default CourseGrade;
