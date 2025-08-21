import mongoose from "mongoose";

console.log("Initializing ApprovalReason model");

// Check mongoose connection
if (!mongoose.connection || mongoose.connection.readyState !== 1) {
  console.log(
    "Warning: Mongoose is not connected when loading ApprovalReason model"
  );
}

const ApprovalReasonSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["approval", "rejection"], // موافقت یا مخالفت
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
ApprovalReasonSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better performance
ApprovalReasonSchema.index({ code: 1 });
ApprovalReasonSchema.index({ type: 1 });
ApprovalReasonSchema.index({ isActive: 1 });

// Check if model exists already to prevent overwrite during hot reload
const ApprovalReasonModel =
  mongoose.models?.ApprovalReason ||
  mongoose.model("ApprovalReason", ApprovalReasonSchema);

export default ApprovalReasonModel;
