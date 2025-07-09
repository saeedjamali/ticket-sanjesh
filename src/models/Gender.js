import mongoose from "mongoose";

const genderSchema = new mongoose.Schema(
  {
    genderCode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    genderTitle: {
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

const Gender =
  mongoose.models?.Gender || mongoose.model("Gender", genderSchema);

export default Gender;
