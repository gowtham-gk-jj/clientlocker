
const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    // Person who performed the activity.
    person_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person",
      required: [true, "Person ID is required"]
    },

    // Target person affected by access changes (e.g., staff/auditor).
    target_person_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person",
      default: null
    },

    // Client associated with the activity.
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null
    },

    // File associated with the activity.
    file_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoredFile",
      default: null
    },

    // Activity action.
    action: {
      type: String,
      required: [true, "Activity action is required"],
      trim: true,
      enum: [
        // File activities
        "FILE_UPLOADED",
        "FILE_OPENED",

        // Access management activities
        "ACCESS_GRANTED",
        "ACCESS_REMOVED",
        "ACCESS_BLOCKED",
        "FILE_DOWNLOAD_BLOCKED",

        // AI document processing activities
        "AI_DOCUMENT_PROCESSED",

        // AI checklist activities
        "AI_CHECKLIST_SUGGESTED",
        "AI_CHECKLIST_ACCEPTED",
        "AI_CHECKLIST_REJECTED"
      ]
    },

    // Whether the activity was blocked.
    blocked: {
      type: Boolean,
      default: false
    }
  },
  {
    collection: "activity_log",

    timestamps: {
      createdAt: "created_at",
      updatedAt: false
    },

    versionKey: false
  }
);

// ==========================================
// INDEXES
// ==========================================

// Retrieve recent activities.
activityLogSchema.index({
  created_at: -1
});

// Retrieve activities performed by a person.
activityLogSchema.index({
  person_id: 1,
  created_at: -1
});

// Retrieve activities related to a file.
activityLogSchema.index({
  file_id: 1
});

// Retrieve activities related to a client.
activityLogSchema.index({
  client_id: 1,
  created_at: -1
});

// Retrieve blocked activities.
activityLogSchema.index({
  blocked: 1,
  created_at: -1
});

// Retrieve AI activities.
activityLogSchema.index({
  action: 1,
  created_at: -1
});

// ==========================================
// MODEL
// ==========================================

const ActivityLog =
  mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", activityLogSchema);

module.exports = ActivityLog;
