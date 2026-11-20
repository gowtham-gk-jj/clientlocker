
const express = require("express");
const router = express.Router();

const {
  protect,
  authorize
} = require("../middleware/authMiddleware");

const {
  requireClientAccess
} = require("../middleware/clientAccessMiddleware");

const {
  getClientChecklist,
  updateChecklistItem,
  getAISuggestions,
  decideAISuggestion
} = require("../controllers/checklistController");

const {
  generateChecklistSuggestions
} = require("../controllers/aiChecklistController");

// ==========================================
// GET CLIENT CHECKLIST
// Partner, staff, client and auditor
// ==========================================

router.get(
  "/clients/:clientId/checklist",
  protect,
  authorize("partner", "staff", "client", "auditor"),
  requireClientAccess,
  getClientChecklist
);

// ==========================================
// UPDATE CHECKLIST ITEM
// Partner and staff only
// ==========================================

router.patch(
  "/checklist/:id",
  protect,
  authorize("partner", "staff"),
  updateChecklistItem
);

// ==========================================
// GENERATE AI CHECKLIST SUGGESTIONS
// Partner and staff only
// ==========================================

router.post(
  "/clients/:clientId/files/:fileId/ai-checklist-suggestions",
  protect,
  authorize("partner", "staff"),
  requireClientAccess,
  generateChecklistSuggestions
);

// ==========================================
// GET AI CHECKLIST SUGGESTIONS
// Partner, staff, client and auditor
// ==========================================

router.get(
  "/clients/:clientId/ai-checklist-suggestions",
  protect,
  authorize("partner", "staff", "client", "auditor"),
  requireClientAccess,
  getAISuggestions
);

// ==========================================
// ACCEPT OR REJECT AI SUGGESTION
// Partner and staff only
// ==========================================

router.patch(
  "/ai-checklist-suggestions/:id",
  protect,
  authorize("partner", "staff"),
  decideAISuggestion
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
