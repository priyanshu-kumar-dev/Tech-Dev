import mongoose from "mongoose";

const detectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    severity: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low"],
      required: true,
    },
    priorityScore: { type: Number, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    repairAction: { type: String, default: "" },
    boundingBox: { type: [Number], default: null },
    simulated: { type: Boolean, default: false },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Reported", "Verified", "Assigned", "In Progress", "Resolved"],
      required: true,
    },
    changedAt: { type: Date, required: true },
    changedBy: { type: String, default: "system" },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    image: { type: String, required: true },
    imageUrl: { type: String, required: true },
    originalName: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now, index: true },
    location: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
    },
    city: { type: String, trim: true, maxlength: 100, default: "" },
    ward: { type: String, trim: true, maxlength: 100, default: "" },
    detections: { type: [detectionSchema], default: [] },
    mode: { type: String, default: "demo" },
    isSimulated: { type: Boolean, default: false },
    inferenceTimeMs: { type: Number, min: 0, default: null },
    imageHash: { type: String, required: true, index: true },
    possibleDuplicateOf: { type: String, default: null },
    maintenanceStatus: {
      type: String,
      enum: ["Reported", "Verified", "Assigned", "In Progress", "Resolved"],
      default: "Reported",
      index: true,
    },
    assignedTo: { type: String, trim: true, maxlength: 120, default: "" },
    statusUpdatedAt: { type: Date, default: null },
    statusUpdatedBy: { type: String, default: "" },
    statusHistory: { type: [statusHistorySchema], default: [] },
    repairImageUrl: { type: String, default: "" },
  },
  {
    versionKey: false,
    toJSON: {
      transform(_document, report) {
        report.id = report._id;
        delete report._id;
        delete report.imageHash;
        return report;
      },
    },
  }
);

const Report =
  mongoose.models.Report || mongoose.model("Report", reportSchema);

export default Report;
