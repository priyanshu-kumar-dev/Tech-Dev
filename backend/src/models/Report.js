
import mongoose from "mongoose";

const RepairPhotoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: null },
    note: { type: String, default: "" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const StatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        "Reported",
        "Assigned",
        "In Progress",
        "Repaired",
        "Verified",
      ],
      required: true,
    },
    note: { type: String, default: "" },
    changedBy: { type: String, default: "System" },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ReportSchema = new mongoose.Schema(
  {
    // Unique report identifier
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Image and video information
    image: String,
    imageUrl: String,
    mediaUrl: String,
    cloudinaryPublicId: String,
    resourceType: String,
    localImageUrl: String,
    originalName: String,

    mediaType: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },

    // GPS location
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      source: { type: String, default: null },
    },

    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },

    // AI detections
    detections: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    detectionCount: {
      type: Number,
      default: 0,
    },

    framesAnalyzed: {
      type: Number,
      default: 0,
    },

    // Road damage severity
    severity: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low", "None"],
      default: "None",
    },

    // Explainable repair priority
    priorityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },

    priorityReasons: {
      type: [String],
      default: [],
    },

    // Potential duplicate tracking.
    // Reports are linked, never automatically deleted or merged.
    incidentGroupId: {
      type: String,
      default: null,
      index: true,
    },

    possibleDuplicateOf: {
      type: String,
      default: null,
      index: true,
    },

    duplicateFlag: {
      type: Boolean,
      default: false,
    },

    duplicateDistanceMeters: {
      type: Number,
      default: null,
      min: 0,
    },

    duplicateMatchReason: {
      type: String,
      default: "",
    },

    // Existing repair workflow
    repairStatus: {
      type: String,
      enum: [
        "Open",
        "Reported",
        "Assigned",
        "In Progress",
        "Repaired",
        "Verified",
      ],
      default: "Reported",
      index: true,
    },

    assignedTeam: {
      type: String,
      default: "",
    },

    repairNotes: {
      type: String,
      default: "",
    },

    statusHistory: {
      type: [StatusHistorySchema],
      default: [],
    },

    // Before and after repair evidence
    beforeRepairPhotos: {
      type: [RepairPhotoSchema],
      default: [],
    },

    afterRepairPhotos: {
      type: [RepairPhotoSchema],
      default: [],
    },

    repairedAt: {
      type: Date,
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    // Detection mode and demo indicator
    mode: String,

    isSimulated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Repair priority sorting
ReportSchema.index({
  priorityScore: -1,
  createdAt: -1,
});

// Filter reports by status and severity
ReportSchema.index({
  repairStatus: 1,
  severity: 1,
});

// GPS-based incident candidate searches
ReportSchema.index({
  "location.latitude": 1,
  "location.longitude": 1,
});

export default mongoose.model("Report", ReportSchema);
