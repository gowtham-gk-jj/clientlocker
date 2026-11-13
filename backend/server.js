
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const multer = require("multer");

// Load environment variables
dotenv.config();

const app = express();

// ======================================
// IMPORT M2 ROUTES ONLY
// ======================================

const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");
const clientRoutes = require("./routes/clientRoutes");

// Validate route exports
const routes = [
  ["authRoutes", authRoutes],
  ["fileRoutes", fileRoutes],
  ["clientRoutes", clientRoutes]
];

for (const [name, route] of routes) {
  if (typeof route !== "function") {
    throw new Error(
      `${name} must export a valid Express router.`
    );
  }
}

// ======================================
// SECURITY MIDDLEWARE
// ======================================

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
  })
);

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
        : "Disconnected"
  });
});

// ======================================
// API WELCOME
// ======================================

app.get("/api", (req, res) => {
  return res.status(200).json({
    success: true,
    project: "ClientLocker",
    message: "Welcome to ClientLocker API",
    version: "1.0.0",
    milestone: "M2"
  });
});

// ======================================
// AUTHENTICATION ROUTES - M2
// ======================================

app.use("/api/auth", authRoutes);

// ======================================
// CLIENT ROUTES - M2
// ======================================

app.use("/api", clientRoutes);

// ======================================
// FILE MANAGEMENT ROUTES - M2
// ======================================

app.use("/api", fileRoutes);

// Expected M2 endpoints:
// GET  /api/clients
// GET  /api/clients/:clientId/files
// POST /api/clients/:clientId/files
// GET  /api/files/:id/open
//
// Actual paths depend on your route definitions.

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

  // Multer upload errors
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

const startServer = async () => {
  try {

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing.");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing.");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Atlas connected successfully");

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log("====================================");
      console.log("CLIENTLOCKER M2 BACKEND STARTED");
      console.log("====================================");
      console.log(`Port: ${PORT}`);
      console.log(`Health: /api/health`);
      console.log(`Authentication: /api/auth`);
      console.log(`Clients: /api/clients`);
      console.log(`Files: /api/files`);
      console.log("====================================");
    });

    server.on("error", (error) => {
      console.error("HTTP server error:", error.message);
    });

  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

// ======================================
// START SERVER
// ======================================

if (require.main === module) {
  startServer();
}

module.exports = app;
