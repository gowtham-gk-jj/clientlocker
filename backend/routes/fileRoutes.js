
const express = require("express");
const router = express.Router();

// ==========================================
// M2 MIDDLEWARE
// ==========================================

const {
  protect,
  authorize
} = require("../middleware/authMiddleware");

const upload = require("../middleware/upload");

// ==========================================
// M2 CONTROLLER
// ==========================================

const {
  uploadFile,
  getClientFiles
} = require("../controllers/fileController");

// ==========================================
// TASK 3: LIST CLIENT FILES
// ==========================================

router.get(
  "/clients/:clientId/files",
  protect,
  getClientFiles
);

// ==========================================
// TASK 3: UPLOAD CLIENT FILES
// ==========================================

router.post(
  "/clients/:clientId/files",
  protect,
  authorize("partner", "staff"),
  upload.single("file"),
  upload.validateFileSignature,
  uploadFile
);

module.exports = router;
