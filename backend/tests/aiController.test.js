const mongoose = require("mongoose");
const {
  generateChecklistSuggestions,
  suggestForFile
} = require("../controllers/aiChecklistController");
const {
  decideAISuggestion,
  confirmFileSuggestion
} = require("../controllers/checklistController");

// Mock dependencies
const StoredFile = require("../models/File");
const Client = require("../models/Client");
const ChecklistItem = require("../models/ChecklistItem");
const ChecklistSuggestion = require("../models/ChecklistSuggestion");
const ActivityLog = require("../models/ActivityLog");
const ClientAccess = require("../models/ClientAccess");
const { suggestChecklist } = require("../services/aiService");
const axios = require("axios");

jest.mock("../models/File");
jest.mock("../models/Client");
jest.mock("../models/ChecklistItem");
jest.mock("../models/ChecklistSuggestion");
jest.mock("../models/ActivityLog");
jest.mock("../models/ClientAccess");
jest.mock("../services/cloudinaryService", () => ({
  generatePrivateDownloadUrl: jest.fn().mockReturnValue("https://res.cloudinary.com/fake/private.pdf")
}));
jest.mock("../services/aiService");
jest.mock("axios");
jest.mock("pdf-parse", () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: jest.fn().mockResolvedValue({
      pages: [{ text: "March 2026 bank statement account balance", num: 1 }],
      text: "March 2026 bank statement account balance"
    }),
    destroy: jest.fn().mockResolvedValue()
  }))
}));

describe("AI Controller & Authorization Tests", () => {
  const firmId = new mongoose.Types.ObjectId();
  const clientId = new mongoose.Types.ObjectId();
  const fileId = new mongoose.Types.ObjectId();
  const partnerId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();
  const auditorId = new mongoose.Types.ObjectId();
  const clientIdUser = new mongoose.Types.ObjectId();

  const mockFile = {
    _id: fileId,
    client_id: clientId,
    name: "statement.pdf",
    file_type: "PDF"
  };

  const mockChecklistItems = [
    { _id: new mongoose.Types.ObjectId(), name: "March bank statement", done: false },
    { _id: new mongoose.Types.ObjectId(), name: "PAN card", done: false }
  ];

  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();

    // Default axios buffer download mock
    axios.get.mockResolvedValue({
      data: Buffer.from("%PDF-1.4 mock pdf data")
    });

    // Default ActivityLog mock
    ActivityLog.create.mockResolvedValue({});
  });

  test("1. Authorized partner can request AI suggestions", async () => {
    req = {
      user: { _id: partnerId, firm_id: firmId, role: "partner" },
      params: { clientId: clientId.toString(), fileId: fileId.toString() }
    };

    Client.findOne.mockResolvedValue({ _id: clientId, firm_id: firmId });
    StoredFile.findOne.mockResolvedValue(mockFile);
    ChecklistItem.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockChecklistItems)
    });

    suggestChecklist.mockResolvedValue({
      success: true,
      request_id: "req_001",
      suggestion: {
        checklist_item_id: mockChecklistItems[0]._id.toString(),
        checklist_item_name: "March bank statement",
        score: 100,
        reason: "Document type matches. Month matches."
      },
      requires_approval: true,
      manual_selection_required: false
    });

    ChecklistSuggestion.create.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      suggested_item: "March bank statement",
      status: "pending"
    });

    await generateChecklistSuggestions(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      requires_approval: true,
      suggestions: expect.any(Array)
    }));
    expect(ChecklistSuggestion.create).toHaveBeenCalledWith(expect.objectContaining({
      status: "pending",
      suggested_item: "March bank statement"
    }));
  });

  test("2. Authorized staff with ClientAccess can request suggestions", async () => {
    req = {
      user: { _id: staffId, firm_id: firmId, role: "staff" },
      params: { clientId: clientId.toString(), fileId: fileId.toString() }
    };

    Client.findOne.mockResolvedValue({ _id: clientId, firm_id: firmId });
    ClientAccess.findOne.mockResolvedValue({ person_id: staffId, client_id: clientId });
    StoredFile.findOne.mockResolvedValue(mockFile);
    ChecklistItem.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockChecklistItems)
    });

    suggestChecklist.mockResolvedValue({
      success: true,
      suggestion: {
        checklist_item_name: "March bank statement",
        score: 90,
        reason: "Matches"
      }
    });

    ChecklistSuggestion.create.mockResolvedValue({
      suggested_item: "March bank statement",
      status: "pending"
    });

    await generateChecklistSuggestions(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("3. Staff without ClientAccess receives HTTP 403 Forbidden", async () => {
    req = {
      user: { _id: staffId, firm_id: firmId, role: "staff" },
      params: { clientId: clientId.toString(), fileId: fileId.toString() }
    };

    Client.findOne.mockResolvedValue({ _id: clientId, firm_id: firmId });
    ClientAccess.findOne.mockResolvedValue(null); // No assignment

    await generateChecklistSuggestions(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: "You do not have access to this client."
    }));
    expect(suggestChecklist).not.toHaveBeenCalled();
  });

  test("4. Client role cannot generate AI suggestions (HTTP 403)", async () => {
    req = {
      user: { _id: clientIdUser, firm_id: firmId, role: "client" },
      params: { clientId: clientId.toString(), fileId: fileId.toString() }
    };

    await generateChecklistSuggestions(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: "Only partners and staff can generate AI suggestions."
    }));
    expect(suggestChecklist).not.toHaveBeenCalled();
  });

  test("5. Auditor role cannot generate AI suggestions (HTTP 403)", async () => {
    req = {
      user: { _id: auditorId, firm_id: firmId, role: "auditor" },
      params: { clientId: clientId.toString(), fileId: fileId.toString() }
    };

    await generateChecklistSuggestions(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(suggestChecklist).not.toHaveBeenCalled();
  });

  test("6. AI service failure returns safe fallback without crashing or deleting document", async () => {
    req = {
      user: { _id: partnerId, firm_id: firmId, role: "partner" },
      params: { clientId: clientId.toString(), fileId: fileId.toString() }
    };

    Client.findOne.mockResolvedValue({ _id: clientId, firm_id: firmId });
    StoredFile.findOne.mockResolvedValue(mockFile);
    ChecklistItem.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockChecklistItems)
    });

    suggestChecklist.mockRejectedValue(new Error("AI service timeout or connection refused"));

    await generateChecklistSuggestions(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      manual_selection_required: true,
      suggestions: []
    }));
    expect(StoredFile.findOne).toHaveBeenCalled();
  });

  test("7. No matching checklist item returns manual selection required", async () => {
    req = {
      user: { _id: partnerId, firm_id: firmId, role: "partner" },
      params: { clientId: clientId.toString(), fileId: fileId.toString() }
    };

    Client.findOne.mockResolvedValue({ _id: clientId, firm_id: firmId });
    StoredFile.findOne.mockResolvedValue(mockFile);
    ChecklistItem.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockChecklistItems)
    });

    suggestChecklist.mockResolvedValue({
      success: true,
      suggestion: null,
      manual_selection_required: true,
      message: "No reliable match found."
    });

    await generateChecklistSuggestions(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      manual_selection_required: true,
      suggestions: []
    }));
    expect(ChecklistSuggestion.create).not.toHaveBeenCalled();
  });

  test("8. Human approval updates suggestion to accepted and logs activity", async () => {
    const suggestionId = new mongoose.Types.ObjectId();
    const mockSuggestion = {
      _id: suggestionId,
      client_id: clientId,
      file_id: fileId,
      firm_id: firmId,
      status: "pending",
      save: jest.fn().mockResolvedValue(true)
    };

    ChecklistSuggestion.findOne.mockResolvedValue(mockSuggestion);
    Client.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: clientId })
    });

    const decideReq = {
      user: { _id: partnerId, firm_id: firmId, role: "partner" },
      params: { id: suggestionId.toString() },
      body: { status: "accepted" }
    };

    await decideAISuggestion(decideReq, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockSuggestion.status).toBe("accepted");
    expect(mockSuggestion.decided_by).toBe(partnerId);
    expect(mockSuggestion.save).toHaveBeenCalled();
    expect(ActivityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      action: "AI_CHECKLIST_ACCEPTED"
    }));
  });

  test("9. Human rejection updates suggestion to rejected and logs activity", async () => {
    const suggestionId = new mongoose.Types.ObjectId();
    const mockSuggestion = {
      _id: suggestionId,
      client_id: clientId,
      file_id: fileId,
      firm_id: firmId,
      status: "pending",
      save: jest.fn().mockResolvedValue(true)
    };

    ChecklistSuggestion.findOne.mockResolvedValue(mockSuggestion);
    Client.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: clientId })
    });

    const decideReq = {
      user: { _id: partnerId, firm_id: firmId, role: "partner" },
      params: { id: suggestionId.toString() },
      body: { status: "rejected" }
    };

    await decideAISuggestion(decideReq, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockSuggestion.status).toBe("rejected");
    expect(mockSuggestion.save).toHaveBeenCalled();
    expect(ActivityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      action: "AI_CHECKLIST_REJECTED"
    }));
  });

  test("10. Confirming suggestion ticks matched incomplete checklist item", async () => {
    const suggestionId = new mongoose.Types.ObjectId();
    const itemId = new mongoose.Types.ObjectId();
    const mockChecklistItem = {
      _id: itemId,
      client_id: clientId,
      name: "March bank statement",
      done: false,
      save: jest.fn().mockResolvedValue(true)
    };
    const mockSuggestion = {
      _id: suggestionId,
      client_id: clientId,
      file_id: fileId,
      firm_id: firmId,
      matched_checklist_item_id: itemId,
      status: "pending",
      save: jest.fn().mockResolvedValue(true)
    };

    ChecklistSuggestion.findOne.mockResolvedValue(mockSuggestion);
    Client.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: clientId })
    });
    ChecklistItem.findOne.mockResolvedValue(mockChecklistItem);

    const decideReq = {
      user: { _id: partnerId, firm_id: firmId, role: "partner" },
      params: { id: suggestionId.toString() },
      body: { status: "accepted" }
    };

    await decideAISuggestion(decideReq, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockChecklistItem.done).toBe(true);
    expect(mockChecklistItem.save).toHaveBeenCalled();
    expect(mockSuggestion.status).toBe("accepted");
  });

  test("11. Confirming an already completed checklist item returns HTTP 409", async () => {
    const suggestionId = new mongoose.Types.ObjectId();
    const itemId = new mongoose.Types.ObjectId();
    const mockChecklistItem = {
      _id: itemId,
      client_id: clientId,
      name: "March bank statement",
      done: true,
      save: jest.fn()
    };
    const mockSuggestion = {
      _id: suggestionId,
      client_id: clientId,
      file_id: fileId,
      firm_id: firmId,
      matched_checklist_item_id: itemId,
      status: "pending",
      save: jest.fn()
    };

    ChecklistSuggestion.findOne.mockResolvedValue(mockSuggestion);
    Client.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: clientId })
    });
    ChecklistItem.findOne.mockResolvedValue(mockChecklistItem);

    const decideReq = {
      user: { _id: partnerId, firm_id: firmId, role: "partner" },
      params: { id: suggestionId.toString() },
      body: { status: "accepted" }
    };

    await decideAISuggestion(decideReq, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockChecklistItem.save).not.toHaveBeenCalled();
    expect(mockSuggestion.save).not.toHaveBeenCalled();
  });

  test("12. Invalid file ID on POST /api/files/:id/suggest returns HTTP 400", async () => {
    const suggestReq = {
      user: { _id: partnerId, firm_id: firmId, role: "partner" },
      params: { id: "not-an-object-id" }
    };

    await suggestForFile(suggestReq, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: "Invalid file ID."
    }));
  });

  test("13. Manual checklist selection via POST /api/files/:id/confirm completes selected item", async () => {
    const itemId = new mongoose.Types.ObjectId();
    const mockChecklistItem = {
      _id: itemId,
      client_id: clientId,
      name: "Tax return documents",
      done: false,
      save: jest.fn().mockResolvedValue(true)
    };

    StoredFile.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: fileId, client_id: clientId })
    });
    Client.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: clientId })
    });
    ChecklistSuggestion.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(null)
    });
    ChecklistItem.findOne.mockResolvedValue(mockChecklistItem);

    const confirmReq = {
      user: { _id: partnerId, firm_id: firmId, role: "partner" },
      params: { id: fileId.toString() },
      body: { checklist_item_id: itemId.toString(), status: "accepted" }
    };

    await confirmFileSuggestion(confirmReq, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockChecklistItem.done).toBe(true);
    expect(mockChecklistItem.save).toHaveBeenCalled();
    expect(ActivityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      action: "AI_CHECKLIST_ACCEPTED"
    }));
  });
});
