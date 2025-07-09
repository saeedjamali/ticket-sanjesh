import mongoose from "mongoose";

const organizationalUnitTypeSchema = new mongoose.Schema(
  {
    unitTypeCode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    unitTypeTitle: {
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


const OrganizationalUnitType =
  mongoose.models?.OrganizationalUnitType ||
  mongoose.model("OrganizationalUnitType", organizationalUnitTypeSchema);

export default OrganizationalUnitType;
