const axios = require("axios");
const { suggestChecklist, checkHealth, AIServiceError } = require("../services/aiService");

jest.mock("axios");

describe("AI Service - Standalone-AI Integration Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      AI_SERVICE_URL: "https://standalone-ai-clientlocker.onrender.com",
      AI_SERVICE_API_KEY: "test-valid-api-secret-12345",
      AI_SERVICE_TIMEOUT_MS: "5000"
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("1. Successful suggestion response sends correct payload and headers", async () => {
    const mockApiResponse = {
      success: true,
      request_id: "req_test_001",
      suggestion: {
        checklist_item_id: "item_001",
        checklist_item_name: "March bank statement",
        score: 100,
        reason: "Document type matches. Month matches."
      },
      requires_approval: true,
      manual_selection_required: false,
      message: "Checklist suggestion generated. Human approval is required."
    };

    axios.post.mockResolvedValueOnce({
      status: 200,
      data: mockApiResponse
    });

    const result = await suggestChecklist({
      requestId: "req_test_001",
      fileId: "file_123",
      clientId: "client_456",
      documentText: "March 2026 bank statement transactions",
      openChecklistItems: [
        { _id: "item_001", name: "March bank statement" },
        { _id: "item_002", name: "GST invoice" }
      ]
    });

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [calledUrl, payload, config] = axios.post.mock.calls[0];

    expect(calledUrl).toBe("https://standalone-ai-clientlocker.onrender.com/api/v1/checklist/suggest");
    expect(config.headers["X-API-Key"]).toBe("test-valid-api-secret-12345");
    expect(config.headers["Content-Type"]).toBe("application/json");
    expect(payload.request_id).toBe("req_test_001");
    expect(payload.document_text).toBe("March 2026 bank statement transactions");
    expect(payload.open_checklist_items).toEqual([
      { id: "item_001", name: "March bank statement" },
      { id: "item_002", name: "GST invoice" }
    ]);

    expect(result).toEqual(mockApiResponse);
    expect(result.suggestion.checklist_item_id).toBe("item_001");
  });

  test("2. Fails when AI_SERVICE_API_KEY is missing", async () => {
    delete process.env.AI_SERVICE_API_KEY;

    await expect(suggestChecklist({
      documentText: "sample text",
      openChecklistItems: []
    })).rejects.toThrow("AI_SERVICE_API_KEY is not configured.");
  });

  test("3. Fails when AI_SERVICE_URL is missing", async () => {
    delete process.env.AI_SERVICE_URL;

    await expect(suggestChecklist({
      documentText: "sample text",
      openChecklistItems: []
    })).rejects.toThrow("AI_SERVICE_URL is not configured.");
  });

  test("4. Invalid API key response (HTTP 401) is handled with AIServiceError", async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { detail: "Invalid API authentication secret." }
      }
    });

    await expect(suggestChecklist({
      documentText: "sample text",
      openChecklistItems: []
    })).rejects.toMatchObject({
      code: "AI_UNAUTHORIZED",
      status: 401
    });
  });

  test("5. AI service timeout (ECONNABORTED) is handled with code AI_TIMEOUT", async () => {
    axios.post.mockRejectedValueOnce({
      code: "ECONNABORTED",
      message: "timeout of 5000ms exceeded"
    });

    await expect(suggestChecklist({
      documentText: "sample text",
      openChecklistItems: []
    })).rejects.toMatchObject({
      code: "AI_TIMEOUT",
      status: 504
    });
  });

  test("6. AI service unavailable (network error) is handled with code AI_CONNECTION_ERROR", async () => {
    axios.post.mockRejectedValueOnce(new Error("connect ECONNREFUSED 127.0.0.1:8000"));

    await expect(suggestChecklist({
      documentText: "sample text",
      openChecklistItems: []
    })).rejects.toMatchObject({
      code: "AI_CONNECTION_ERROR",
      status: 503
    });
  });

  test("7. AI service health check reports Connected when healthy", async () => {
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: { success: true, service: "Standalone-AI", status: "healthy" }
    });

    const health = await checkHealth();
    expect(health.success).toBe(true);
    expect(health.ai).toBe("Connected");
  });

  test("8. AI service health check reports Unavailable when unreachable", async () => {
    axios.get.mockRejectedValueOnce(new Error("Network Error"));

    const health = await checkHealth();
    expect(health.success).toBe(false);
    expect(health.ai).toBe("Unavailable");
  });
});
