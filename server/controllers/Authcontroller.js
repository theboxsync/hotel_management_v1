const User = require("../models/User");
const HotelAdmin = require("../models/HotelAdmin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTPs temporarily (in production, use Redis)
const otpStore = new Map();

/**
 * @desc    Register new hotel
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerHotel = async (req, res) => {
  try {
    const {
      hotel_name,
      owner_name,
      email,
      phone,
      address,
      password,
      confirm_password,
    } = req.body;

    // Validation
    if (
      !hotel_name ||
      !owner_name ||
      !email ||
      !phone ||
      !address ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Password validation
    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const existingAdmin = await HotelAdmin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Create user (hotel registration)
    const user = new User({
      hotel_name,
      owner_name,
      email,
      phone,
      address,
      verification_status: false,
      status: "inactive", // Inactive until verified
    });

    const savedUser = await user.save();

    // Create hotel admin
    const hotelAdmin = new HotelAdmin({
      hotel_id: savedUser._id.toString(),
      name: owner_name,
      email,
      password_hash: password, // Will be hashed by pre-save hook
      role: "admin",
      permissions: {
        manage_rooms: true,
        manage_bookings: true,
        manage_staff: true,
        view_analytics: true,
        manage_settings: true,
      },
      is_verified: false,
    });

    await hotelAdmin.save();

    // Generate OTP for email verification
    const otp = generateOTP();
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      userId: savedUser._id.toString(),
    });

    // TODO: Send OTP via email
    // For now, return OTP in response (REMOVE IN PRODUCTION)
    console.log(`OTP for ${email}: ${otp}`);

    res.status(201).json({
      success: true,
      message:
        "Registration successful. Please verify your email with the OTP sent.",
      data: {
        hotel_id: savedUser._id,
        email: savedUser.email,
        otp: otp, // REMOVE IN PRODUCTION
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  }
};

/**
 * @desc    Verify email with OTP
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Check OTP
    const storedOTP = otpStore.get(email);
    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or invalid",
      });
    }

    if (storedOTP.expiresAt < Date.now()) {
      otpStore.delete(email);
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    if (storedOTP.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Update user verification status
    const user = await User.findByIdAndUpdate(
      storedOTP.userId,
      {
        verification_status: true,
        status: "active",
      },
      { new: true }
    );

    // Update hotel admin verification status
    await HotelAdmin.findOneAndUpdate(
      { hotel_id: storedOTP.userId },
      { is_verified: true }
    );

    // Remove OTP from store
    otpStore.delete(email);

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: {
        hotel_id: user._id,
        hotel_name: user.hotel_name,
        verification_status: user.verification_status,
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during verification",
      error: error.message,
    });
  }
};

/**
 * @desc    Resend OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.verification_status) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      userId: user._id.toString(),
    });

    // TODO: Send OTP via email
    console.log(`New OTP for ${email}: ${otp}`);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      otp: otp, // REMOVE IN PRODUCTION
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find hotel admin
    const hotelAdmin = await HotelAdmin.findOne({ email });
    if (!hotelAdmin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if verified
    if (!hotelAdmin.is_verified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(
      password,
      hotelAdmin.password_hash
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Get user details
    const user = await User.findById(hotelAdmin.hotel_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    // Check if hotel is active
    if (user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Your account is inactive. Please contact support.",
      });
    }

    // Check subscription status
    if (user.subscription_expiry && user.subscription_expiry < new Date()) {
      const gracePeriod = new Date(user.subscription_expiry);
      gracePeriod.setDate(gracePeriod.getDate() + 7);

      if (new Date() > gracePeriod) {
        return res.status(401).json({
          success: false,
          message: "Your subscription has expired. Please renew to continue.",
          subscription_expired: true,
        });
      }
    }

    // Generate token
    const token = await hotelAdmin.generateAuthToken(hotelAdmin.role);

    // Update last login
    hotelAdmin.last_login = new Date();
    await hotelAdmin.save();

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: hotelAdmin._id,
          hotel_id: user._id,
          hotel_name: user.hotel_name,
          name: hotelAdmin.name,
          email: hotelAdmin.email,
          role: hotelAdmin.role,
          permissions: hotelAdmin.permissions,
        },
        subscription: {
          subscription_id: user.subscription_id,
          subscription_expiry: user.subscription_expiry,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
  try {
    const hotelAdmin = await HotelAdmin.findById(req.user._id).select(
      "-password_hash"
    );
    const user = await User.findById(hotelAdmin.hotel_id);

    res.status(200).json({
      success: true,
      data: {
        admin: hotelAdmin,
        hotel: user,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  try {
    // In a production app with refresh tokens, you would invalidate the token here
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  registerHotel,
  verifyEmail,
  resendOTP,
  login,
  getProfile,
  logout,
};
