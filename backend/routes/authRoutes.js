
const express = require("express");
const router = express.Router();

const {
  login,
  testLogin
} = require("../controllers/authController");

const {
  protect
} = require("../middleware/authMiddleware");

// ======================================
// M2: EMAIL AND PASSWORD LOGIN
// ======================================

router.post("/login", login);

// ======================================
// M2: DEVELOPMENT TEST LOGIN
// ======================================

router.post("/test-login", testLogin);

// ======================================
// M2: GET CURRENT LOGGED-IN USER
// ======================================

router.get("/me", protect, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Authenticated user retrieved successfully.",
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      firm_id: req.user.firm_id,
      client_id: req.user.client_id,
      is_active: req.user.is_active
    }
  });
});

module.exports = router;
