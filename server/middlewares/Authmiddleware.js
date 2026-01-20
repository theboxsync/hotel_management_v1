const jwt = require("jsonwebtoken");
const HotelAdmin = require("../models/HotelAdmin");
const User = require("../models/User");

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authentication token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRETKEY);

    // Find user
    const hotelAdmin = await HotelAdmin.findById(decoded._id);

    if (!hotelAdmin) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    // Check if user is verified
    if (!hotelAdmin.is_verified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    // Attach user info to request
    req.user = {
      _id: hotelAdmin._id,
      hotel_id: hotelAdmin.hotel_id,
      email: hotelAdmin.email,
      role: hotelAdmin.role,
      permissions: hotelAdmin.permissions,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token has expired",
      });
    }

    console.error("Authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during authentication",
      error: error.message,
    });
  }
};

/**
 * Subscription middleware
 * Checks if hotel has active subscription
 */
const checkSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.hotel_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    // Check if user is active
    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact support.",
      });
    }

    // Check subscription expiry
    if (user.subscription_expiry) {
      const now = new Date();
      const expiryDate = new Date(user.subscription_expiry);

      if (now > expiryDate) {
        // Check if within grace period (7 days)
        const gracePeriodEnd = new Date(expiryDate);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

        if (now > gracePeriodEnd) {
          return res.status(403).json({
            success: false,
            message:
              "Your subscription has expired. Please renew to continue using our services.",
            subscription_expired: true,
          });
        }

        // Within grace period - allow but warn
        req.subscriptionWarning = {
          message: "Your subscription is in grace period. Please renew soon.",
          grace_period_ends: gracePeriodEnd,
        };
      }
    }

    // Attach subscription info to request
    req.subscription = {
      subscription_id: user.subscription_id,
      subscription_expiry: user.subscription_expiry,
    };

    next();
  } catch (error) {
    console.error("Subscription check error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during subscription check",
      error: error.message,
    });
  }
};

/**
 * Permission middleware
 * Checks if user has required permission
 */
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (!req.user.permissions[requiredPermission]) {
      return res.status(403).json({
        success: false,
        message: `You don't have permission to ${requiredPermission}`,
      });
    }

    next();
  };
};

/**
 * Role middleware
 * Checks if user has required role
 */
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have the required role to access this resource",
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  checkSubscription,
  checkPermission,
  checkRole,
};
