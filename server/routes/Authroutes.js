const express = require("express");
const AuthRouter = express.Router();
const {
  registerHotel,
  verifyEmail,
  resendOTP,
  login,
  getProfile,
  logout,
  createStaff,
  updateStaff,
  updateStaffPermissions,
  getAllStaff,
  updateStaffStatus,
  deleteStaff,
} = require("../controllers/AuthController");
const { authenticate, adminOnly } = require("../middlewares/AuthMiddleware");

/**
 * @route   POST /api/auth/register
 * @desc    Register new hotel (Creates admin user)
 * @access  Public
 */
AuthRouter.post("/register", registerHotel);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with OTP
 * @access  Public
 */
AuthRouter.post("/verify-email", verifyEmail);

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP for email verification
 * @access  Public
 */
AuthRouter.post("/resend-otp", resendOTP);

/**
 * @route   POST /api/auth/login
 * @desc    Login user (admin, manager, or staff)
 * @access  Public
 */
AuthRouter.post("/login", login);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
AuthRouter.get("/profile", authenticate, getProfile);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
AuthRouter.post("/logout", authenticate, logout);

// ==================== Staff Management Routes (Admin Only) ====================

/**
 * @route   POST /api/auth/staff
 * @desc    Create new staff member or manager
 * @access  Private (Admin only)
 */
AuthRouter.post("/staff", authenticate, adminOnly, createStaff);

/**
 * @route   PUT /api/auth/staff/:staffId
 * @desc    Update staff member details (name, email, role)
 * @access  Private (Admin only)
 */
AuthRouter.put("/staff/:staffId", authenticate, adminOnly, updateStaff);

/**
 * @route   GET /api/auth/staff
 * @desc    Get all staff members
 * @access  Private (Admin only)
 */
AuthRouter.get("/staff", authenticate, adminOnly, getAllStaff);

/**
 * @route   PUT /api/auth/staff/:staffId/permissions
 * @desc    Update staff member permissions
 * @access  Private (Admin only)
 */
AuthRouter.put(
  "/staff/:staffId/permissions",
  authenticate,
  adminOnly,
  updateStaffPermissions
);

/**
 * @route   PUT /api/auth/staff/:staffId/status
 * @desc    Activate/deactivate staff member
 * @access  Private (Admin only)
 */
AuthRouter.put(
  "/staff/:staffId/status",
  authenticate,
  adminOnly,
  updateStaffStatus
);

/**
 * @route   DELETE /api/auth/staff/:staffId
 * @desc    Delete staff member
 * @access  Private (Admin only)
 */
AuthRouter.delete("/staff/:staffId", authenticate, adminOnly, deleteStaff);

module.exports = AuthRouter;