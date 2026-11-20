
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// ======================================
// LOAD ENVIRONMENT VARIABLES
// ======================================

dotenv.config();

const app = express();

// ======================================
// IMPORT ROUTES
// ======================================

const authRoutes = require("./routes/authRoutes");
const demoRoutes = require("./routes/demoRoutes");
const fileRoutes = require("./routes/fileRoutes");
const clientRoutes = require("./routes/clientRoutes");
const checklistRoutes = require("./routes/checklistRoutes");
const accessRoutes = require("./routes/accessRoutes");
const activityRoutes = require("./routes/activityRoutes");

// Remote Standalone-AI service
const aiService = require("./services/aiService");

// ======================================
// VALIDATE ROUTE EXPORTS
// ======================================

const routes = [
  ["authRoutes", authRoutes],
  ["demoRoutes", demoRoutes],
  ["fileRoutes", fileRoutes],
  ["clientRoutes", clientRoutes],
  ["checklistRoutes", checklistRoutes],
  ["accessRoutes", accessRoutes],
  ["activityRoutes", activityRoutes]
];

for (const [name, route] of routes) {
  if (typeof route !== "function") {
    throw new Error(
      `${name} must export a valid Express router. Check its route file.`
    );
  }
}

// ======================================
// REMOTE AI SERVICE CONFIGURATION
// ======================================

const aiServiceUrl = process.env.AI_SERVICE_URL;
const aiServiceApiKey = process.env.AI_SERVICE_API_KEY;

if (aiServiceUrl && aiServiceApiKey) {
  console.log("Remote AI service configured at:", aiServiceUrl);
} else {
  console.warn("AI_SERVICE_URL or AI_SERVICE_API_KEY is missing. AI features will be unavailable.");
}

// ======================================
// CORS CONFIGURATION
// ======================================

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

if (process.env.ALLOW_LOCAL_FRONTEND === "true") {
  allowedOrigins.push("http://localhost:5173");
}

const uniqueOrigins = [...new Set(allowedOrigins)];

console.log("Allowed frontend origins:", uniqueOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");

      if (uniqueOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn("Blocked CORS origin:", origin);

      return callback(
        new Error("Origin not allowed by CORS.")
      );
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ],

    credentials: true,
    optionsSuccessStatus: 204
  })
);

// ======================================
// SECURITY MIDDLEWARE
// ======================================

app.use(helmet());

// ======================================
// REQUEST PARSING
// ======================================

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb"
  })
);

// ======================================
// HEALTH CHECK
// ======================================

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    project: "ClientLocker",
    message: "Backend is running",

    database:
      mongoose.connection.readyState === 1
        ? "Connected"
        : "Disconnected",

    ai: pythonConfigured
      ? "Configured"
      : "Not configured"
  });
});

// ======================================
// AI SERVICE HEALTH CHECK
// ======================================

app.get("/api/ai/health", async (req, res) => {
  const health = await aiService.checkHealth();
  return res.status(health.success ? 200 : 503).json(health);
});

// ======================================
// API WELCOME
// ======================================

app.get("/api", (req, res) => {
  return res.status(200).json({
    success: true,
    project: "ClientLocker",
    message: "Welcome to ClientLocker API",
    description: "Secure Client File Management System",
    version: "1.0.0"
  });
});

// ======================================
// AUTHENTICATION ROUTES
// ======================================

app.use("/api/auth", authRoutes);

// ======================================
// DEMO ACCOUNT ROUTES
// ======================================

app.use("/api/demo", demoRoutes);

// ======================================
// CHECKLIST MANAGEMENT + AI ROUTES
// ======================================

app.use("/api", checklistRoutes);

// ======================================
// FILE MANAGEMENT ROUTES
// ======================================

app.use("/api", fileRoutes);

// ======================================
// CLIENT MANAGEMENT ROUTES
// ======================================

app.use("/api", clientRoutes);

// ======================================
// ACCESS MANAGEMENT ROUTES
// ======================================

app.use("/api", accessRoutes);

// ======================================
// ACTIVITY LOG ROUTES
// ======================================

app.use("/api", activityRoutes);

// ======================================
// 404 HANDLER
// ======================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint not found"
  });
});

// ======================================
// CENTRAL ERROR HANDLER
// ======================================

app.use((error, req, res, next) => {
  console.error("API Error:", error);

  if (res.headersSent) {
    return next(error);
  }

  // Multer errors
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "File size cannot exceed 4 MB."
      });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Only one file can be uploaded at a time."
      });
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected file field. Use the field name 'file'."
      });
    }

    return res.status(400).json({
      success: false,
      message: "File upload failed."
    });
  }

  // CORS errors
  if (error.message === "Origin not allowed by CORS.") {
    return res.status(403).json({
      success: false,
      message: "This frontend origin is not allowed."
    });
  }

  // Request body parsing errors
  if (error.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body exceeds the allowed size."
    });
  }

  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body."
    });
  }

  // Client-side validation errors
  if (error.statusCode && error.statusCode < 500) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
  }

  if (error.status && error.status < 500) {
    return res.status(error.status).json({
      success: false,
      message: error.message
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

// ======================================
// SERVER STARTUP
// ======================================

const PORT = process.env.PORT || 5000;

let httpServer;

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing.");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing.");
    }

    if (uniqueOrigins.length === 0) {
      throw new Error("FRONTEND_URL is missing.");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Atlas connected successfully");

    httpServer = app.listen(PORT, "0.0.0.0", () => {
      console.log("====================================");
      console.log("CLIENTLOCKER BACKEND STARTED");
      console.log("====================================");
      console.log(`Port: ${PORT}`);
      console.log("Health: /api/health");
      console.log("AI Health: /api/ai/health");
      console.log("Auth: /api/auth");
      console.log("Demo: /api/demo");
      console.log("Clients: /api");
      console.log("Files: /api");
      console.log("Checklist: /api");
      console.log("====================================");

      console.log(
        "Python executable:",
        pythonExecutable
      );

      console.log(
        "Python bridge:",
        pythonConfigured ? "Configured" : "Unavailable"
      );
    });

    httpServer.on("error", (error) => {
      console.error("HTTP server error:", error.message);
    });

  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

// ======================================
// GRACEFUL SHUTDOWN
// ======================================

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down ClientLocker...`);

  try {
    if (httpServer) {
      await new Promise((resolve, reject) => {
        httpServer.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    await mongoose.disconnect();

    console.log("ClientLocker shutdown completed.");
    process.exit(0);

  } catch (error) {
    console.error("Shutdown error:", error.message);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ======================================
// START SERVER
// ======================================

if (require.main === module) {
  startServer();
}

module.exports = app;
