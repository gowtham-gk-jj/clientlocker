const mongoose = require("mongoose");
const axios = require("axios");

const { generateChecklistSuggestions } = require("../controllers/aiChecklistController");
const { decideAISuggestion } = require("../controllers/checklistController");
const { suggestChecklist } = require("../services/aiService");

// Mock Models
const StoredFile = require("../models/File");
const Client = require("../models/Client");
const ChecklistItem = require("../models/ChecklistItem");
const ChecklistSuggestion = require("../models/ChecklistSuggestion");
const ActivityLog = require("../models/ActivityLog");
const ClientAccess = require("../models/ClientAccess");

let mockExtractedText = "March 2026 Bank Statement Account 987654";

jest.mock("../models/File");
jest.mock("../models/Client");
jest.mock("../models/ChecklistItem");
jest.mock("../models/ChecklistSuggestion");
jest.mock("../models/ActivityLog");
jest.mock("../models/ClientAccess");
jest.mock("../services/cloudinaryService", () => ({
  generatePrivateDownloadUrl: jest.fn().mockReturnValue("https://res.cloudinary.com/clientlocker/private/doc.pdf")
}));
jest.mock("axios");
jest.mock("pdf-parse", () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: jest.fn().mockImplementation(() => {
      if (!mockExtractedText) {
        return Promise.resolve({ pages: [{ text: "", num: 1 }], text: "" });
      }
      return Promise.resolve({
        pages: [
          { text: mockExtractedText, num: 1 },
          { text: "Page 2: Second page should be ignored", num: 2 }
        ],
        text: `${mockExtractedText}\n\nPage 2: Second page should be ignored`
      });
    }),
    destroy: jest.fn().mockResolvedValue()
  }))
}));

describe("M9 Production-Readiness & Security Verification", () => {
  const firmId = new mongoose.Types.ObjectId();
  const clientId = new mongoose.Types.ObjectId();
  const fileId = new mongoose.Types.ObjectId();
  const partnerId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();
  const auditorId = new mongoose.Types.ObjectId();

  const mockFile = {
    _id: fileId,
    client_id: clientId,
    name: "March_Bank_Statement.pdf",
    file_type: "PDF"
  };

  const mockChecklistItems = [
    { _id: new mongoose.Types.ObjectId(), name: "March bank statement", done: false },
    { _id: new mongoose.Types.ObjectId(), name: "Annual GST return", done: false }
  ];

  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExtractedText = "March 2026 Bank Statement Account 987654";

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();

    process.env.AI_SERVICE_URL = "https://standalone-ai-clientlocker.onrender.com";
    process.env.AI_SERVICE_API_KEY = "prod-test-secret-key-xyz";
    process.env.AI_SERVICE_TIMEOUT_MS = "60000";

    ActivityLog.create.mockResolvedValue({});
  });

  test("1. Production AI URL and X-API-Key header are configured and sent correctly", async () => {
    axios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        request_id: "req_prod_1",
        suggestion: {
          checklist_item_id: "item_01",
          checklist_item_name: "March bank statement",
          score: 100,
          reason: "Matches"
        },
        requires_approval: true,
        manual_selection_required: false
      }
    });

    await suggestChecklist({
      requestId: "req_prod_1",
      fileId,
      clientId,
      documentText: "March 2026 bank statement",
      openChecklistItems: [{ _id: "item_01", name: "March bank statement" }]
    });

    const [calledUrl, payload, config] = axios.post.mock.calls[0];
    expect(calledUrl).toBe("https://standalone-ai-clientlocker.onrender.com/api/v1/checklist/suggest");
    expect(config.headers["X-API-Key"]).toBe("prod-test-secret-key-xyz");
    expect(config.timeout).toBe(60000);
    expect(payload.open_checklist_items[0].id).toBe("item_01");
  });

  test("2. Valid multi-page PDF extracts ONLY first-page text for AI suggestion", async () => {
    axios.get.mockResolvedValueOnce({
      data: Buffer.from("%PDF-1.4 mock valid multi-page binary")
    });

    axios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        suggestion: {
          checklist_item_id: mockChecklistItems[0]._id.toString(),
          checklist_item_name: "March bank statement",
          score: 100,
          reason: "Document type matches. Month matches."
        },
        requires_approval: true,
        manual_selection_required: false
      }
    });

    req = {
      user: { _id: partnerId, firm_id: firmId, role: "partner" },
      params: { clientId: clientId.toString(), fileId: fileId.toString() }
    };

    Client.findOne.mockResolvedValue({ _id: clientId, firm_id: firmId });
    StoredFile.findOne.mockResolvedValue(mockFile);
    ChecklistItem.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockChecklistItems)
    });

    ChecklistSuggestion.create.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      suggested_item: "March bank statement",
      status: "pending"
    });

    await generateChecklistSuggestions(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    const sentAiPayload = axios.post.mock.calls[0][1];
    expect(sentAiPayload.document_text).toBe("March 2026 Bank Statement Account 987654");
    expect(sentAiPayload.document_text).not.toContain("Page 2: Second page should be ignored");
  });

  test("3. Unreadable / empty PDF safely triggers manual selection without failing", async () => {
    mockExtractedText = ""; // Simulate scanned / empty text

    axios.get.mockResolvedValueOnce({
      data: Buffer.from("%PDF-1.4 empty text")
    });

    req = {
      user: { _id: partnerId, firm_id: firmId, role: "partner" },
      params: { clientId: clientId.toString(), fileId: fileId.toString() }
    };

    Client.findOne.mockResolvedValue({ _id: clientId, firm_id: firmId });
    StoredFile.findOne.mockResolvedValue(mockFile);
    ChecklistItem.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockChecklistItems)
    });

    await generateChecklistSuggestions(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      manual_selection_required: true,
      suggestions: []
    }));
    expect(axios.post).not.toHaveBeenCalled();
  });

  test("4. Download exceeding 4 MB is rejected safely", async () => {
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024); // 5 MB

    axios.get.mockResolvedValueOnce({
      data: oversizedBuffer
    });

    req = {
      user: { _id: partnerId, firm_id: firmId, role: "partner" },
      params: { clientId: clientId.toString(), fileId: fileId.toString() }
    };

    Client.findOne.mockResolvedValue({ _id: clientId, firm_id: firmId });
    StoredFile.findOne.mockResolvedValue(mockFile);
    ChecklistItem.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockChecklistItems)
    });

    await generateChecklistSuggestions(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      manual_selection_required: true,
      suggestions: []
    }));
    expect(axios.post).not.toHaveBeenCalled();
  });

  test("5. No AI response can autonomously mark a checklist item as done", async () => {
    axios.get.mockResolvedValueOnce({ data: Buffer.from("%PDF-1.4 mock") });
    axios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        suggestion: {
          checklist_item_id: mockChecklistItems[0]._id.toString(),
          checklist_item_name: "March bank statement",
          score: 100,
          reason: "Matches"
        },
        requires_approval: true,
        manual_selection_required: false
      }
    });

    req = {
      user: { _id: partnerId, firm_id: firmId, role: "partner" },
      params: { clientId: clientId.toString(), fileId: fileId.toString() }
    };

    Client.findOne.mockResolvedValue({ _id: clientId, firm_id: firmId });
    StoredFile.findOne.mockResolvedValue(mockFile);
    ChecklistItem.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockChecklistItems)
    });

    ChecklistSuggestion.create.mockResolvedValue({
      status: "pending"
    });

    await generateChecklistSuggestions(req, res, next);

    // ChecklistItem model update functions must never be called during AI suggestion
    expect(ChecklistItem.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(ChecklistItem.updateOne).not.toHaveBeenCalled();
    expect(mockChecklistItems[0].done).toBe(false);
  });

  test("6. Standalone-AI outage (503 / timeout) preserves uploaded file and enables manual selection", async () => {
    axios.get.mockResolvedValueOnce({ data: Buffer.from("%PDF-1.4 mock") });
    axios.post.mockRejectedValueOnce(new Error("connect ETIMEDOUT standalone-ai-clientlocker.onrender.com"));

    req = {
      user: { _id: partnerId, firm_id: firmId, role: "partner" },
      params: { clientId: clientId.toString(), fileId: fileId.toString() }
    };

    Client.findOne.mockResolvedValue({ _id: clientId, firm_id: firmId });
    StoredFile.findOne.mockResolvedValue(mockFile);
    ChecklistItem.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockChecklistItems)
    });

    await generateChecklistSuggestions(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: expect.stringContaining("temporarily unavailable"),
      manual_selection_required: true,
      suggestions: []
    }));
    expect(StoredFile.findOne).toHaveBeenCalled();
  });

  test("7. Client access removal immediately revokes staff ability to generate suggestions", async () => {
    req = {
      user: { _id: staffId, firm_id: firmId, role: "staff" },
      params: { clientId: clientId.toString(), fileId: fileId.toString() }
    };

    Client.findOne.mockResolvedValue({ _id: clientId, firm_id: firmId });
    ClientAccess.findOne.mockResolvedValue(null); // Revoked access

    await generateChecklistSuggestions(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: "You do not have access to this client."
    }));
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });

  test("8. Auditor cannot generate suggestions or approve/reject suggestions", async () => {
    const genReq = {
      user: { _id: auditorId, firm_id: firmId, role: "auditor" },
      params: { clientId: clientId.toString(), fileId: fileId.toString() }
    };

    await generateChecklistSuggestions(genReq, res, next);
    expect(res.status).toHaveBeenCalledWith(403);

    const decideReq = {
      user: { _id: auditorId, firm_id: firmId, role: "auditor" },
      params: { id: new mongoose.Types.ObjectId().toString() },
      body: { status: "accepted" }
    };

    await decideAISuggestion(decideReq, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
