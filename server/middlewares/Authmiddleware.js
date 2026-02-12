const jwt = require("jsonwebtoken");
const HotelAdmin = require("../models/HotelAdmin");
const User = require("../models/User");

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authentication token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRETKEY);

    const hotelAdmin = await HotelAdmin.findById(decoded._id);

    if (!hotelAdmin) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
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

    req.user = {
      _id: hotelAdmin._id,
      hotel_id: hotelAdmin.hotel_id,
      email: hotelAdmin.email,
      role: hotelAdmin.role,
      permissions: hotelAdmin.permissions,
    };

    // Attach the full hotelAdmin object for methods
    req.hotelAdmin = hotelAdmin;

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

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact support.",
      });
    }

    if (user.subscription_expiry) {
      const now = new Date();
      const expiryDate = new Date(user.subscription_expiry);

      if (now > expiryDate) {
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

        req.subscriptionWarning = {
          message: "Your subscription is in grace period. Please renew soon.",
          grace_period_ends: gracePeriodEnd,
        };
      }
    }

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
 * Granular permission middleware
 * Checks if user has specific permission for a module and action
 * @param {string} module - Permission module (e.g., 'manage_rooms')
 * @param {string} action - Permission action (e.g., 'create', 'read', 'update', 'delete')
 */
const checkPermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Admin has all permissions
    if (req.user.role === "admin") {
      return next();
    }

    // Check if user has the specific permission
    if (
      !req.user.permissions ||
      !req.user.permissions[module] ||
      !req.user.permissions[module][action]
    ) {
      return res.status(403).json({
        success: false,
        message: `You don't have permission to ${action} ${module.replace(
          /_/g,
          " "
        )}`,
      });
    }

    next();
  };
};

/**
 * Multiple permissions check (user needs at least one)
 * Useful for endpoints that can be accessed with different permissions
 */
const checkAnyPermission = (...permissionChecks) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Admin has all permissions
    if (req.user.role === "admin") {
      return next();
    }

    // Check if user has any of the specified permissions
    const hasPermission = permissionChecks.some(({ module, action }) => {
      return (
        req.user.permissions &&
        req.user.permissions[module] &&
        req.user.permissions[module][action]
      );
    });

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You don't have the required permissions to access this resource",
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

/**
 * Admin only middleware (shorthand)
 */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "This action is restricted to administrators only",
    });
  }
  next();
};

module.exports = {
  authenticate,
  checkSubscription,
  checkPermission,
  checkAnyPermission,
  checkRole,
  adminOnly,
};