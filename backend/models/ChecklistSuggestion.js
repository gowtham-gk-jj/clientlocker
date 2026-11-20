
const mongoose = require("mongoose");

const checklistSuggestionSchema = new mongoose.Schema(
  {
    firm_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Firm",
      required: true,
      index: true
    },

    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true
    },

    file_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoredFile",
      required: true,
      index: true
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person",
      required: true
    },

    suggested_item: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    matched_checklist_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChecklistItem",
      default: null
    },

    match_score: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },

    reason: {
      type: String,
      default: "",
      maxlength: 1000
    },

    manual_selection_required: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      index: true
    },

    decided_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person",
      default: null
    },

    decided_at: {
      type: Date,
      default: null
    }
  },
  {
    collection: "checklist_suggestions",
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    },
    versionKey: false
  }
);

checklistSuggestionSchema.index({
  client_id: 1,
  created_at: -1
});

checklistSuggestionSchema.index({
  file_id: 1,
  created_at: -1
});

module.exports = mongoose.model(
  "ChecklistSuggestion",
  checklistSuggestionSchema
);
