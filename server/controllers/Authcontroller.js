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
 * @desc    Register new hotel (Admin only)
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
      status: "inactive",
    });

    const savedUser = await user.save();

    // Create hotel admin with full permissions
    const hotelAdmin = new HotelAdmin({
      hotel_id: savedUser._id.toString(),
      name: owner_name,
      email,
      password_hash: password,
      role: "admin",
      permissions: {
        manage_rooms: { read: true, create: true, update: true, delete: true },
        manage_bookings: {
          read: true,
          create: true,
          update: true,
          delete: true,
          cancel: true,
        },
        manage_staff: { read: true, create: true, update: true, delete: true },
        view_analytics: { dashboard: true, reports: true, export: true },
        manage_settings: {
          hotel_info: true,
          pricing: true,
          integrations: true,
        },
        manage_payments: { view: true, refund: true },
        manage_customers: {
          read: true,
          create: true,
          update: true,
          delete: true,
        },
      },
      is_verified: false,
    });

    await hotelAdmin.save();

    // Generate OTP for email verification
    const otp = generateOTP();
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      userId: savedUser._id.toString(),
    });

    // TODO: Send OTP via email
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

    const user = await User.findByIdAndUpdate(
      storedOTP.userId,
      {
        verification_status: true,
        status: "active",
      },
      { new: true }
    );

    await HotelAdmin.findOneAndUpdate(
      { hotel_id: storedOTP.userId },
      { is_verified: true }
    );

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

    const otp = generateOTP();
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      userId: user._id.toString(),
    });

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

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const hotelAdmin = await HotelAdmin.findOne({ email });
    if (!hotelAdmin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!hotelAdmin.is_verified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    if (!hotelAdmin.is_active) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated. Please contact admin.",
      });
    }

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

    const user = await User.findById(hotelAdmin.hotel_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    if (user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Your account is inactive. Please contact support.",
      });
    }

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

    const token = await hotelAdmin.generateAuthToken(hotelAdmin.role);

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
          permissions: hotelAdmin.getEffectivePermissions(),
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
        admin: {
          ...hotelAdmin.toObject(),
          effective_permissions: hotelAdmin.getEffectivePermissions(),
        },
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

/**
 * @desc    Create staff/manager
 * @route   POST /api/auth/staff/create
 * @access  Private (Admin only)
 */
const createStaff = async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, and role are required",
      });
    }

    // Only admin can create staff
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can create staff members",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Check if email already exists
    const existingAdmin = await HotelAdmin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Validate role
    if (!["manager", "staff"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'manager' or 'staff'",
      });
    }

    // Create staff member
    const staffMember = new HotelAdmin({
      hotel_id: req.user.hotel_id,
      name,
      email,
      password_hash: password,
      role,
      permissions: permissions || {
        manage_rooms: { read: false, create: false, update: false, delete: false },
        manage_bookings: {
          read: false,
          create: false,
          update: false,
          delete: false,
          cancel: false,
        },
        manage_staff: { read: false, create: false, update: false, delete: false },
        view_analytics: { dashboard: false, reports: false, export: false },
        manage_settings: {
          hotel_info: false,
          pricing: false,
          integrations: false,
        },
        manage_payments: { view: false, refund: false },
        manage_customers: {
          read: false,
          create: false,
          update: false,
          delete: false,
        },
      },
      is_verified: true, // Staff created by admin are auto-verified
      created_by: req.user._id,
    });

    await staffMember.save();

    res.status(201).json({
      success: true,
      message: `${role} created successfully`,
      data: {
        id: staffMember._id,
        name: staffMember.name,
        email: staffMember.email,
        role: staffMember.role,
        permissions: staffMember.permissions,
      },
    });
  } catch (error) {
    console.error("Create staff error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating staff",
      error: error.message,
    });
  }
};

/**
 * @desc    Update staff permissions
 * @route   PUT /api/auth/staff/:staffId/permissions
 * @access  Private (Admin only)
 */
const updateStaffPermissions = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { permissions } = req.body;

    // Only admin can update permissions
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can update staff permissions",
      });
    }

    const staffMember = await HotelAdmin.findOne({
      _id: staffId,
      hotel_id: req.user.hotel_id,
    });

    if (!staffMember) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    // Cannot update admin permissions
    if (staffMember.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot update admin permissions",
      });
    }

    staffMember.permissions = permissions;
    await staffMember.save();

    res.status(200).json({
      success: true,
      message: "Permissions updated successfully",
      data: {
        id: staffMember._id,
        name: staffMember.name,
        email: staffMember.email,
        role: staffMember.role,
        permissions: staffMember.permissions,
      },
    });
  } catch (error) {
    console.error("Update permissions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating permissions",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all staff members
 * @route   GET /api/auth/staff
 * @access  Private (Admin only)
 */
const getAllStaff = async (req, res) => {
  try {
    // Only admin can view all staff
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can view all staff members",
      });
    }

    const staffMembers = await HotelAdmin.find({
      hotel_id: req.user.hotel_id,
      role: { $ne: "admin" }, // Exclude admin
    }).select("-password_hash");

    res.status(200).json({
      success: true,
      count: staffMembers.length,
      data: staffMembers,
    });
  } catch (error) {
    console.error("Get all staff error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching staff",
      error: error.message,
    });
  }
};

/**
 * @desc    Update staff status (activate/deactivate)
 * @route   PUT /api/auth/staff/:staffId/status
 * @access  Private (Admin only)
 */
const updateStaffStatus = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { is_active } = req.body;

    // Only admin can update status
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can update staff status",
      });
    }

    const staffMember = await HotelAdmin.findOne({
      _id: staffId,
      hotel_id: req.user.hotel_id,
    });

    if (!staffMember) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    if (staffMember.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot deactivate admin account",
      });
    }

    staffMember.is_active = is_active;
    await staffMember.save();

    res.status(200).json({
      success: true,
      message: `Staff ${is_active ? "activated" : "deactivated"} successfully`,
      data: {
        id: staffMember._id,
        name: staffMember.name,
        is_active: staffMember.is_active,
      },
    });
  } catch (error) {
    console.error("Update staff status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating staff status",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete staff member
 * @route   DELETE /api/auth/staff/:staffId
 * @access  Private (Admin only)
 */
const deleteStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    // Only admin can delete staff
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can delete staff members",
      });
    }

    const staffMember = await HotelAdmin.findOne({
      _id: staffId,
      hotel_id: req.user.hotel_id,
    });

    if (!staffMember) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    if (staffMember.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot delete admin account",
      });
    }

    await HotelAdmin.findByIdAndDelete(staffId);

    res.status(200).json({
      success: true,
      message: "Staff member deleted successfully",
    });
  } catch (error) {
    console.error("Delete staff error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting staff",
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
  createStaff,
  updateStaffPermissions,
  getAllStaff,
  updateStaffStatus,
  deleteStaff,
};