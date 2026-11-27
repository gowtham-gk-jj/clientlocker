
const mongoose = require("mongoose");

const ChecklistItem = require("../models/ChecklistItem");
const ChecklistSuggestion = require("../models/ChecklistSuggestion");
const Client = require("../models/Client");
const ClientAccess = require("../models/ClientAccess");
const ActivityLog = require("../models/ActivityLog");
const { logBlockedAccess } = require("../middleware/clientAccessMiddleware");

const AUDITOR_MAX_CLIENTS = 2;

// ==========================================
// CHECK WHETHER USER CAN ACCESS CLIENT
// ==========================================

const canAccessClient = async (user, clientId) => {
  try {
    if (
      !user ||
      !user._id ||
      !user.firm_id ||
      !mongoose.Types.ObjectId.isValid(clientId)
    ) {
      return false;
    }

    const client = await Client.findOne({
      _id: clientId,
      firm_id: user.firm_id
    }).select("_id");

    if (!client) {
      return false;
    }

    // PARTNER: Access all clients in their firm.
    if (user.role === "partner") {
      return true;
    }

    // CLIENT: Access only their own client record.
    if (user.role === "client") {
      return Boolean(
        user.client_id &&
        String(user.client_id) === String(clientId)
      );
    }

    // STAFF: Explicit assignment required.
    if (user.role === "staff") {
      return Boolean(
        await ClientAccess.exists({
          person_id: user._id,
          client_id: clientId
        })
      );
    }

    // AUDITOR: Maximum two assigned clients.
    if (user.role === "auditor") {
      const assignments = await ClientAccess.find({
        person_id: user._id
      })
        .sort({ created_at: 1, _id: 1 })
        .limit(AUDITOR_MAX_CLIENTS)
        .select("client_id")
        .populate({
          path: "client_id",
          match: {
            firm_id: user.firm_id
          },
          select: "_id"
        })
        .lean();

      return assignments.some(
        (assignment) =>
          assignment.client_id &&
          String(assignment.client_id._id) === String(clientId)
      );
    }

    return false;
  } catch (error) {
    console.error("Client access verification error:", error.message);
    return false;
  }
};

// ==========================================
// RECORD ACTIVITY
// ==========================================

const recordActivity = async ({
  user,
  clientId,
  fileId = null,
  action
}) => {
  try {
    await ActivityLog.create({
      person_id: user._id,
      client_id: clientId,
      file_id: fileId,
      action,
      blocked: false
    });
  } catch (error) {
    console.error("Checklist activity logging error:", error.message);
  }
};

// ==========================================
// GET CLIENT CHECKLIST
// ==========================================

const getClientChecklist = async (req, res) => {
  try {
    const { clientId } = req.params;

    const allowed = await canAccessClient(
      req.user,
      clientId
    );

    if (!allowed) {
      await logBlockedAccess(req.user, clientId);

      return res.status(403).json({
        success: false,
        message: "You do not have access to this client's checklist."
      });
    }

    const items = await ChecklistItem.find({
      client_id: clientId
    }).sort({
      created_at: 1,
      _id: 1
    });

    return res.status(200).json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error("Get checklist error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve checklist."
    });
  }
};

// ==========================================
// UPDATE CHECKLIST ITEM
// ==========================================

const updateChecklistItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { done } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid checklist item ID."
      });
    }

    if (typeof done !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Checklist status must be true or false."
      });
    }

    const item = await ChecklistItem.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Checklist item not found."
      });
    }

    const allowed = await canAccessClient(
      req.user,
      item.client_id
    );

    if (!allowed) {
      await logBlockedAccess(req.user, item.client_id);

      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this checklist."
      });
    }

    if (req.user.role === "auditor") {
      await logBlockedAccess(req.user, item.client_id);

      return res.status(403).json({
        success: false,
        message: "Auditors have read-only checklist access."
      });
    }

    item.done = done;
    await item.save();

    return res.status(200).json({
      success: true,
      message: "Checklist updated successfully.",
      item
    });
  } catch (error) {
    console.error("Update checklist error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update checklist."
    });
  }
};

// ==========================================
// GET AI CHECKLIST SUGGESTIONS
// ==========================================

const getAISuggestions = async (req, res) => {
  try {
    const { clientId } = req.params;

    const allowed = await canAccessClient(
      req.user,
      clientId
    );

    if (!allowed) {
      await logBlockedAccess(req.user, clientId);

      return res.status(403).json({
        success: false,
        message: "You do not have access to these suggestions."
      });
    }

    const suggestions = await ChecklistSuggestion.find({
      client_id: clientId,
      firm_id: req.user.firm_id
    })
      .populate("file_id", "name file_type")
      .populate("created_by", "name email")
      .populate("decided_by", "name email")
      .populate("matched_checklist_item_id", "name done")
      .sort({
        created_at: -1
      });

    return res.status(200).json({
      success: true,
      count: suggestions.length,
      suggestions
    });
  } catch (error) {
    console.error("Get AI suggestions error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve AI suggestions."
    });
  }
};

// ==========================================
// ACCEPT OR REJECT AI CHECKLIST SUGGESTION
// ==========================================

const decideAISuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid suggestion ID."
      });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be accepted or rejected."
      });
    }

    if (!["partner", "staff"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only partners and staff can review suggestions."
      });
    }

    const suggestion = await ChecklistSuggestion.findOne({
      _id: id,
      firm_id: req.user.firm_id
    });

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: "AI checklist suggestion not found."
      });
    }

    const allowed = await canAccessClient(
      req.user,
      suggestion.client_id
    );

    if (!allowed) {
      await logBlockedAccess(
        req.user,
        suggestion.client_id,
        suggestion.file_id
      );

      return res.status(403).json({
        success: false,
        message: "You do not have permission to review this suggestion."
      });
    }

    if (suggestion.status !== "pending") {
      return res.status(409).json({
        success: false,
        message: "This suggestion has already been reviewed."
      });
    }

    // Update only the suggestion status.
    // Do not automatically complete the checklist item.
    suggestion.status = status;
    suggestion.decided_by = req.user._id;
    suggestion.decided_at = new Date();

    await suggestion.save();

    await recordActivity({
      user: req.user,
      clientId: suggestion.client_id,
      fileId: suggestion.file_id,
      action:
        status === "accepted"
          ? "AI_CHECKLIST_ACCEPTED"
          : "AI_CHECKLIST_REJECTED"
    });

    return res.status(200).json({
      success: true,
      message: `AI checklist suggestion ${status} successfully.`,
      suggestion
    });
  } catch (error) {
    console.error("AI suggestion decision error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update AI checklist suggestion."
    });
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  getClientChecklist,
  updateChecklistItem,
  getAISuggestions,
  decideAISuggestion,
  canAccessClient
};
