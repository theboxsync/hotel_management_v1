const express = require("express");
const AuthRouter = express.Router();
const {
  registerHotel,
  verifyEmail,
  resendOTP,
  login,
  getProfile,
  logout,
} = require("../controllers/Authcontroller");
const { authenticate } = require("../middlewares/Authmiddleware");

/**
 * @route   POST /api/auth/register
 * @desc    Register new hotel
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
 * @desc    Login user
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

module.exports = AuthRouter;
