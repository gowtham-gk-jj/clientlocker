
const mongoose = require("mongoose");
const axios = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Transform } = require("stream");
const { pipeline } = require("stream/promises");

const StoredFile = require("../models/File");
const Client = require("../models/Client");
const ChecklistItem = require("../models/ChecklistItem");
const ChecklistSuggestion = require("../models/ChecklistSuggestion");
const ActivityLog = require("../models/ActivityLog");

const {
  generatePrivateDownloadUrl
} = require("../services/cloudinaryService");

const { runPython } = require("../services/pythonBridge");

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
// NORMALIZE PYTHON RESPONSE
// ======================================

function normalizeSuggestions(result) {
  const data = result?.data ?? result?.result ?? result;

  let suggestions =
    data?.suggestions ??
    data?.results ??
    (data?.suggested_item ? [data] : []);

  if (!Array.isArray(suggestions)) {
    throw new Error("Invalid AI suggestions response.");
  }

  return suggestions.filter(
    (item) =>
      item &&
      typeof item.suggested_item === "string" &&
      item.suggested_item.trim()
  );
}

// ======================================
// DOWNLOAD PRIVATE PDF
// ======================================

async function downloadPrivatePdf(file, destination) {
  const extension = path.extname(file.name || "").toLowerCase();

  if (extension !== ".pdf" || file.file_type !== "PDF") {
    throw new Error("Only PDF files are supported for AI analysis.");
  }

  const privateUrl = generatePrivateDownloadUrl(file, 600);

  const response = await axios.get(privateUrl, {
    responseType: "stream",
    timeout: 30000,
    maxRedirects: 0,
    maxContentLength: MAX_FILE_SIZE
  });

  let totalBytes = 0;

  const sizeLimiter = new Transform({
    transform(chunk, encoding, callback) {
      totalBytes += chunk.length;

      if (totalBytes > MAX_FILE_SIZE) {
        return callback(
          new Error("PDF exceeds the 4 MB AI processing limit.")
        );
      }

      callback(null, chunk);
    }
  });

  try {
    await pipeline(
      response.data,
      sizeLimiter,
      fs.createWriteStream(destination)
    );
  } catch (error) {
    await fs.promises.rm(destination, { force: true });
    throw error;
  }

  if (totalBytes === 0) {
    throw new Error("Downloaded PDF is empty.");
  }
}

// ======================================
// GENERATE AI CHECKLIST SUGGESTIONS
// ======================================

exports.generateChecklistSuggestions = async (req, res, next) => {
  let tempDirectory;

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
      return res.status(404).json({
        success: false,
        message: "Client not found."
      });
    }

    if (user.role === "staff") {
      const ClientAccess = require("../models/ClientAccess");

      const access = await ClientAccess.findOne({
        client_id: clientId,
        person_id: user._id
      });

      if (!access) {
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

    tempDirectory = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "clientlocker-ai-")
    );

    const pdfPath = path.join(tempDirectory, "document.pdf");

    await downloadPrivatePdf(file, pdfPath);

    const pythonResult = await runPython(
      "suggest_checklist_from_document",
      {
        file_path: pdfPath,
        open_checklist_items: checklistItems.map(
          (item) => item.name
        )
      },
      { timeout: 60000 }
    );

    if (!pythonResult || pythonResult.success !== true) {
      throw new Error(
        pythonResult?.error || "AI checklist generation failed."
      );
    }

    const suggestions = normalizeSuggestions(pythonResult);
    const savedSuggestions = [];

    for (const suggestion of suggestions) {
      const suggestedName = suggestion.suggested_item.trim();

      const matchedItem = checklistItems.find(
        (item) =>
          item.name.trim().toLowerCase() ===
          suggestedName.toLowerCase()
      );

      const saved = await ChecklistSuggestion.create({
        firm_id: user.firm_id,
        client_id: clientId,
        file_id: fileId,
        created_by: user._id,
        suggested_item: suggestedName,
        matched_checklist_item_id: matchedItem?._id || null,
        match_score: Math.max(
          0,
          Math.min(100, Number(suggestion.match_score) || 0)
        ),
        reason: suggestion.reason || "AI-generated suggestion.",
        manual_selection_required:
          suggestion.manual_selection_required === true ||
          !matchedItem,
        status: "pending"
      });

      savedSuggestions.push(saved);
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
    }

    return res.status(201).json({
      success: true,
      message: "AI checklist suggestions generated. Human approval is required.",
      requires_approval: true,
      suggestions: savedSuggestions
    });

  } catch (error) {
    next(error);

  } finally {
    if (tempDirectory) {
      await fs.promises.rm(tempDirectory, {
        recursive: true,
        force: true
      }).catch((error) => {
        console.error("Temporary AI file cleanup failed:", error.message);
      });
    }
  }
};
