import mongoose from "mongoose";

const courseBranchFieldSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: true,
      trim: true,
    },
    courseTitle: {
      type: String,
      required: true,
      trim: true,
    },
    branchCode: {
      type: String,
      required: true,
      trim: true,
    },
    branchTitle: {
      type: String,
      required: true,
      trim: true,
    },
    fieldCode: {
      type: String,
      required: true,
      trim: true,
    },
    fieldTitle: {
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
courseBranchFieldSchema.index(
  { courseCode: 1, branchCode: 1, fieldCode: 1 },
  { unique: true }
);

// ایندکس‌های جستجو
courseBranchFieldSchema.index({ courseCode: 1 });
courseBranchFieldSchema.index({ branchCode: 1 });
courseBranchFieldSchema.index({ fieldCode: 1 });
courseBranchFieldSchema.index({ isActive: 1 });

const CourseBranchField =
  mongoose.models?.CourseBranchField ||
  mongoose.model("CourseBranchField", courseBranchFieldSchema);

export default CourseBranchField;
