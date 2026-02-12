const express = require("express");
const router = express.Router();
const { getDashboardAnalytics } = require("../controllers/Analyticscontroller");
const {
    authenticate,
    checkSubscription,
    checkPermission,
} = require("../middlewares/Authmiddleware");

// Apply authentication and subscription check to all booking routes
router.use(authenticate);
router.use(checkSubscription);

/**
 * Analytics Routes
 */

// Get dashboard analytics
// GET /api/analytics/dashboard?period=today|week|month
router.get("/dashboard", getDashboardAnalytics);

module.exports = router;