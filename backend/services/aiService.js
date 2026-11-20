const axios = require("axios");

class AIServiceError extends Error {
  constructor(message, code = "AI_SERVICE_ERROR", status = 500) {
    super(message);
    this.name = "AIServiceError";
    this.code = code;
    this.status = status;
  }
}

function getServiceConfig() {
  const url = (process.env.AI_SERVICE_URL || "").trim().replace(/\/+$/, "");
  const apiKey = (process.env.AI_SERVICE_API_KEY || "").trim();
  const timeout = Number(process.env.AI_SERVICE_TIMEOUT_MS || 60000);

  return {
    url,
    apiKey,
    timeout: Number.isInteger(timeout) && timeout > 0 ? timeout : 60000
  };
}

/**
 * Request checklist suggestions from the standalone AI HTTP service.
 * Never logs document text, API secrets, or private client data.
 */
async function suggestChecklist({
  requestId,
  fileId,
  clientId,
  documentText,
  openChecklistItems
}) {
  const { url, apiKey, timeout } = getServiceConfig();

  if (!url) {
    throw new AIServiceError(
      "AI_SERVICE_URL is not configured.",
      "AI_CONFIG_ERROR",
      503
    );
  }

  if (!apiKey) {
    throw new AIServiceError(
      "AI_SERVICE_API_KEY is not configured.",
      "AI_AUTH_CONFIG_ERROR",
      503
    );
  }

  if (typeof documentText !== "string") {
    throw new AIServiceError(
      "Document text must be provided as a string.",
      "AI_INVALID_INPUT",
      400
    );
  }

  if (!Array.isArray(openChecklistItems)) {
    throw new AIServiceError(
      "Open checklist items must be an array.",
      "AI_INVALID_INPUT",
      400
    );
  }

  const normalizedItems = openChecklistItems.map((item) => {
    if (typeof item === "string") {
      return { id: null, name: item.trim() };
    }
    return {
      id: item._id ? item._id.toString() : (item.id || null),
      name: (item.name || "").trim()
    };
  }).filter((item) => Boolean(item.name));

  const payload = {
    request_id: requestId || `req_${Date.now()}`,
    file_id: fileId ? String(fileId) : undefined,
    client_id: clientId ? String(clientId) : undefined,
    document_text: documentText,
    open_checklist_items: normalizedItems
  };

  try {
    const response = await axios.post(
      `${url}/api/v1/checklist/suggest`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey
        },
        timeout,
        maxContentLength: 10 * 1024 * 1024
      }
    );

    const data = response.data;

    if (!data || typeof data !== "object") {
      throw new AIServiceError(
        "Invalid response format received from AI service.",
        "AI_INVALID_RESPONSE",
        502
      );
    }

    return data;

  } catch (error) {
    if (error instanceof AIServiceError) {
      throw error;
    }

    if (error.code === "ECONNABORTED" || (error.message && error.message.includes("timeout"))) {
      console.error("AI service request timed out after", timeout, "ms");
      throw new AIServiceError(
        "AI service request timed out.",
        "AI_TIMEOUT",
        504
      );
    }

    if (error.response) {
      const status = error.response.status;
      const errorDetail = error.response.data?.detail || error.response.data?.message;

      if (status === 401 || status === 403) {
        console.error("AI service authentication failed (HTTP", status, ")");
        throw new AIServiceError(
          "AI service authentication failed.",
          "AI_UNAUTHORIZED",
          status
        );
      }

      if (status === 422) {
        console.error("AI service rejected request payload (HTTP 422)");
        throw new AIServiceError(
          errorDetail || "AI service validation error.",
          "AI_VALIDATION_ERROR",
          422
        );
      }

      console.error("AI service returned error HTTP", status);
      throw new AIServiceError(
        errorDetail || "AI service request failed.",
        "AI_UPSTREAM_ERROR",
        status
      );
    }

    console.error("AI service network connection failed:", error.message);
    throw new AIServiceError(
      "Unable to connect to AI service.",
      "AI_CONNECTION_ERROR",
      503
    );
  }
}

/**
 * Health check for the remote AI service.
 */
async function checkHealth() {
  const { url, apiKey } = getServiceConfig();

  if (!url || !apiKey) {
    return {
      success: false,
      ai: "Unavailable",
      message: "AI service URL or API key is not configured."
    };
  }

  try {
    const response = await axios.get(`${url}/health`, {
      timeout: 10000
    });

    if (response.status === 200 && response.data?.status === "healthy") {
      return {
        success: true,
        ai: "Connected",
        message: "Remote AI service is healthy and responding."
      };
    }

    return {
      success: false,
      ai: "Degraded",
      message: "Remote AI service reported non-healthy status."
    };

  } catch (error) {
    return {
      success: false,
      ai: "Unavailable",
      message: `Unable to connect to AI service: ${error.message}`
    };
  }
}

module.exports = {
  suggestChecklist,
  checkHealth,
  AIServiceError
};
