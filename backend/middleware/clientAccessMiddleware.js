
const mongoose = require("mongoose");

const Client = require("../models/Client");
const ClientAccess = require("../models/ClientAccess");
const ActivityLog = require("../models/ActivityLog");

// ==========================================
// LOG BLOCKED ACCESS
// ==========================================

const logBlockedAccess = async (user, clientId) => {
  try {
    if (!user || !user._id) return;

    const validClientId =
      clientId && mongoose.Types.ObjectId.isValid(clientId)
        ? new mongoose.Types.ObjectId(clientId)
        : null;

    await ActivityLog.create({
      person_id: user._id,
      client_id: validClientId,
      action: "ACCESS_BLOCKED",
      blocked: true
    });
  } catch (error) {
    // Logging failure must not expose protected data.
    console.error("Blocked access logging error:", error.message);
  }
};

// ==========================================
// CLIENT ACCESS MIDDLEWARE
// ==========================================

const requireClientAccess = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const user = req.user;

    // 1. Authentication check
    if (!user || !user._id || !user.firm_id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    // 2. Validate client ID
    if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID."
      });
    }

    // 3. Find client within the authenticated user's firm
    const client = await Client.findOne({
      _id: clientId,
      firm_id: user.firm_id
    });

    if (!client) {
      await logBlockedAccess(user, clientId);

      return res.status(404).json({
        success: false,
        message: "Client not found or you do not have access to this client."
      });
    }

    // 4. Partner access
    if (user.role === "partner") {
      req.client = client;
      return next();
    }

    // 5. Client access — own records only
    if (user.role === "client") {
      const ownsClient =
        user.client_id &&
        user.client_id.toString() === client._id.toString();

      if (!ownsClient) {
        await logBlockedAccess(user, clientId);

        return res.status(403).json({
          success: false,
          message: "You can only access your own client records."
        });
      }

      req.client = client;
      return next();
    }

    // 6. Staff access — assigned clients only
    if (user.role === "staff") {
      const assignment = await ClientAccess.findOne({
        person_id: user._id,
        client_id: client._id
      }).lean();

      if (!assignment) {
        await logBlockedAccess(user, clientId);

        return res.status(403).json({
          success: false,
          message: "You are not assigned to this client."
        });
      }

      req.client = client;
      return next();
    }

    // 7. Auditor access — maximum two assigned clients
    if (user.role === "auditor") {
      const allowedAssignments = await ClientAccess.find({
        person_id: user._id
      })
        .sort({
          created_at: 1,
          _id: 1
        })
        .limit(2)
        .populate({
          path: "client_id",
          match: {
            firm_id: user.firm_id
          },
          select: "_id firm_id"
        })
        .lean();

      const allowedClientIds = allowedAssignments
        .filter((assignment) => assignment.client_id)
        .map((assignment) => assignment.client_id._id.toString());

      if (!allowedClientIds.includes(client._id.toString())) {
        await logBlockedAccess(user, clientId);

        return res.status(403).json({
          success: false,
          message:
            "Auditors can access only their two permitted assigned clients."
        });
      }

      req.client = client;
      return next();
    }

    // 8. Reject unsupported roles
    await logBlockedAccess(user, clientId);

    return res.status(403).json({
      success: false,
      message: "Your role cannot access client records."
    });

  } catch (error) {
    console.error("Client access middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify client access."
    });
  }
};

module.exports = {
  requireClientAccess
};
