import mongoose from "mongoose";

console.log("Initializing PreliminaryNotice model");

// Check mongoose connection
if (!mongoose.connection || mongoose.connection.readyState !== 1) {
  console.log(
    "Warning: Mongoose is not connected when loading PreliminaryNotice model"
  );
}

const PreliminaryNoticeSchema = new mongoose.Schema({
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
PreliminaryNoticeSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Check if model exists already to prevent overwrite during hot reload
const PreliminaryNoticeModel =
  mongoose.models?.PreliminaryNotice ||
  mongoose.model("PreliminaryNotice", PreliminaryNoticeSchema);

export default PreliminaryNoticeModel;
