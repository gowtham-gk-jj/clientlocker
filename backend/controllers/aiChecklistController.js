const mongoose = require("mongoose");
const axios = require("axios");
const path = require("path");
const { PDFParse } = require("pdf-parse");

const StoredFile = require("../models/File");
const Client = require("../models/Client");
const ChecklistItem = require("../models/ChecklistItem");
const ChecklistSuggestion = require("../models/ChecklistSuggestion");
const ActivityLog = require("../models/ActivityLog");
const ClientAccess = require("../models/ClientAccess");
const { logBlockedAccess } = require("../middleware/clientAccessMiddleware");

const {
  generatePrivateDownloadUrl
} = require("../services/cloudinaryService");

const { suggestChecklist } = require("../services/aiService");

const MAX_FILE_SIZE = 4 * 1024 * 1024;

// ======================================
// ACTIVITY LOG
// ======================================

async function recordActivity(data) {
  try {
    await ActivityLog.create(data);
  } catch (error) {
    console.error("AI activity logging failed:", error.message);
  }
}

// ======================================
// DOWNLOAD PRIVATE PDF INTO BUFFER
// ======================================

async function downloadPrivatePdfBuffer(file) {
  const extension = path.extname(file.name || "").toLowerCase();

  if (extension !== ".pdf" || file.file_type !== "PDF") {
    throw new Error("Only PDF files are supported for AI analysis.");
  }

  const privateUrl = generatePrivateDownloadUrl(file, 600);

  const response = await axios.get(privateUrl, {
    responseType: "arraybuffer",
    timeout: 30000,
    maxRedirects: 0,
    maxContentLength: MAX_FILE_SIZE
  });

  const buffer = Buffer.from(response.data);

  if (!buffer || buffer.length === 0) {
    throw new Error("Downloaded PDF is empty.");
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("Downloaded PDF exceeds 4 MB processing limit.");
  }

  return buffer;
}

// ======================================
// EXTRACT FIRST PAGE TEXT
// ======================================

async function extractFirstPageText(pdfBuffer) {
  const parser = new PDFParse({ data: pdfBuffer });
  try {
    const result = await parser.getText();
    const firstPage = (result.pages && result.pages[0] && result.pages[0].text) || result.text || "";
    return firstPage.trim();
  } finally {
    if (typeof parser.destroy === "function") {
      await parser.destroy().catch(() => {});
    }
  }
}

// ======================================
// GENERATE AI CHECKLIST SUGGESTIONS
// ======================================

exports.generateChecklistSuggestions = async (req, res, next) => {
  try {
    const user = req.user;
    const { clientId, fileId } = req.params;

    if (!mongoose.isValidObjectId(clientId) ||
        !mongoose.isValidObjectId(fileId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client or file ID."
      });
    }

    if (!["partner", "staff"].includes(user.role)) {
      await logBlockedAccess(user, clientId, fileId);

      return res.status(403).json({
        success: false,
        message: "Only partners and staff can generate AI suggestions."
      });
    }

    const client = await Client.findOne({
      _id: clientId,
      firm_id: user.firm_id
    });

    if (!client) {
      await logBlockedAccess(user, clientId, fileId);

      return res.status(404).json({
        success: false,
        message: "Client not found."
      });
    }

    if (user.role === "staff") {
      const access = await ClientAccess.findOne({
        client_id: clientId,
        person_id: user._id
      });

      if (!access) {
        await logBlockedAccess(user, clientId, fileId);

        return res.status(403).json({
          success: false,
          message: "You do not have access to this client."
        });
      }
    }

    const file = await StoredFile.findOne({
      _id: fileId,
      client_id: clientId
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "Client file not found."
      });
    }

    if (file.file_type !== "PDF") {
      return res.status(400).json({
        success: false,
        message: "AI checklist analysis currently supports PDF files only."
      });
    }

    const checklistItems = await ChecklistItem.find({
      client_id: clientId,
      done: false
    }).select("_id name");

    if (checklistItems.length === 0) {
      return res.status(200).json({
        success: true,
        suggestions: [],
        message: "No pending checklist items found."
      });
    }

    // 1. Download private PDF to in-memory buffer
    let pdfBuffer;
    try {
      pdfBuffer = await downloadPrivatePdfBuffer(file);
    } catch (downloadError) {
      console.error("PDF download for AI failed:", downloadError.message);
      return res.status(200).json({
        success: true,
        message: "Unable to retrieve document for AI analysis. Please select a checklist item manually.",
        requires_approval: true,
        manual_selection_required: true,
        suggestions: []
      });
    }

    // 2. Extract first-page readable text
    let documentText = "";
    try {
      documentText = await extractFirstPageText(pdfBuffer);
    } catch (extractError) {
      console.error("PDF text extraction failed:", extractError.message);
    } finally {
      pdfBuffer = null; // Free buffer memory immediately
    }

    if (!documentText) {
      await recordActivity({
        person_id: user._id,
        client_id: clientId,
        file_id: fileId,
        action: "AI_DOCUMENT_PROCESSED",
        blocked: false
      });

      return res.status(200).json({
        success: true,
        message: "No readable text found on the first page. Please select a checklist item manually.",
        requires_approval: true,
        manual_selection_required: true,
        suggestions: []
      });
    }

    // 3. Request suggestion from remote Standalone-AI microservice
    let aiResult;
    try {
      aiResult = await suggestChecklist({
        requestId: `req_${Date.now()}_${fileId}`,
        fileId,
        clientId,
        documentText,
        openChecklistItems: checklistItems
      });
    } catch (aiError) {
      console.error("AI service communication failed:", aiError.message);

      await recordActivity({
        person_id: user._id,
        client_id: clientId,
        file_id: fileId,
        action: "AI_DOCUMENT_PROCESSED",
        blocked: false
      });

      return res.status(200).json({
        success: true,
        message: "AI suggestion service is temporarily unavailable. Please select a checklist item manually.",
        requires_approval: true,
        manual_selection_required: true,
        suggestions: []
      });
    }

    // 4. Map suggestion to pending checklist suggestion
    const savedSuggestions = [];

    if (aiResult && aiResult.success && aiResult.suggestion) {
      const suggestion = aiResult.suggestion;
      const suggestedName = (suggestion.checklist_item_name || "").trim();
      const suggestedId = suggestion.checklist_item_id;

      const matchedItem = checklistItems.find(
        (item) =>
          (suggestedId && String(item._id) === String(suggestedId)) ||
          item.name.trim().toLowerCase() === suggestedName.toLowerCase()
      );

      if (suggestedName) {
        const saved = await ChecklistSuggestion.create({
          firm_id: user.firm_id,
          client_id: clientId,
          file_id: fileId,
          created_by: user._id,
          suggested_item: suggestedName,
          matched_checklist_item_id: matchedItem?._id || null,
          match_score: Math.max(
            0,
            Math.min(100, Number(suggestion.score) || 0)
          ),
          reason: suggestion.reason || "AI-generated suggestion.",
          manual_selection_required:
            aiResult.manual_selection_required === true || !matchedItem,
          status: "pending"
        });

        savedSuggestions.push(saved);
      }
    }

    await recordActivity({
      person_id: user._id,
      client_id: clientId,
      file_id: fileId,
      action: "AI_DOCUMENT_PROCESSED",
      blocked: false
    });

    if (savedSuggestions.length > 0) {
      await recordActivity({
        person_id: user._id,
        client_id: clientId,
        file_id: fileId,
        action: "AI_CHECKLIST_SUGGESTED",
        blocked: false
      });

      return res.status(201).json({
        success: true,
        message: "AI checklist suggestions generated. Human approval is required.",
        requires_approval: true,
        suggestions: savedSuggestions
      });
    }

    return res.status(200).json({
      success: true,
      message: aiResult.message || "No matching checklist item found. Please select manually.",
      requires_approval: true,
      manual_selection_required: true,
      suggestions: []
    });

  } catch (error) {
    next(error);
  }
};

// ======================================
// SUGGEST CHECKLIST BY FILE ID (ALIAS)
// POST /api/files/:id/suggest
// ======================================

exports.suggestForFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file ID."
      });
    }

    const file = await StoredFile.findById(id).select("_id client_id");
    if (!file) {
      return res.status(404).json({
        success: false,
        message: "Client file not found."
      });
    }

    req.params.clientId = String(file.client_id);
    req.params.fileId = String(file._id);
    return exports.generateChecklistSuggestions(req, res, next);
  } catch (error) {
    next(error);
  }
};
