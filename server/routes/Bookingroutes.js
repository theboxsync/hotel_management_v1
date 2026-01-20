const express = require("express");
const router = express.Router();
const {
  createBooking,
  getBookings,
  getBooking,
  getBookingByReference,
  updateBooking,
  cancelBooking,
  completeBooking,
  checkAvailability,
  getBookingStatistics,
  getUpcomingCheckIns,
  getUpcomingCheckOuts,
} = require("../controllers/Bookingcontroller");
const {
  performCheckIn,
  performCheckOut,
  getCurrentlyCheckedIn,
  markNoShow,
  getBookingHistory,
  getTodayCheckIns,
  getTodayCheckOuts,
} = require("../controllers/Checkinoutcontroller");
const {
  authenticate,
  checkSubscription,
  checkPermission,
} = require("../middlewares/Authmiddleware");

// Apply authentication and subscription check to all booking routes
router.use(authenticate);
router.use(checkSubscription);

/**
 * @route   POST /api/bookings/check-availability
 * @desc    Check room availability for dates
 * @access  Private
 */
router.post("/check-availability", checkAvailability);

/**
 * @route   GET /api/bookings/stats
 * @desc    Get booking statistics
 * @access  Private (requires view_analytics permission)
 */
router.get("/stats", checkPermission("view_analytics"), getBookingStatistics);

/**
 * @route   GET /api/bookings/checked-in
 * @desc    Get currently checked-in guests
 * @access  Private
 */
router.get("/checked-in", getCurrentlyCheckedIn);

/**
 * @route   GET /api/bookings/today/check-ins
 * @desc    Get today's expected check-ins
 * @access  Private
 */
router.get("/today/check-ins", getTodayCheckIns);

/**
 * @route   GET /api/bookings/today/check-outs
 * @desc    Get today's expected check-outs
 * @access  Private
 */
router.get("/today/check-outs", getTodayCheckOuts);

/**
 * @route   GET /api/bookings/upcoming-checkins
 * @desc    Get upcoming check-ins
 * @access  Private
 */
router.get("/upcoming-checkins", getUpcomingCheckIns);

/**
 * @route   GET /api/bookings/upcoming-checkouts
 * @desc    Get upcoming check-outs
 * @access  Private
 */
router.get("/upcoming-checkouts", getUpcomingCheckOuts);

/**
 * @route   GET /api/bookings/reference/:reference
 * @desc    Get booking by reference number
 * @access  Private
 */
router.get("/reference/:reference", getBookingByReference);

/**
 * @route   POST /api/bookings
 * @desc    Create new booking
 * @access  Private (requires manage_bookings permission)
 */
router.post("/", checkPermission("manage_bookings"), createBooking);

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings with filters
 * @access  Private
 */
router.get("/", getBookings);

/**
 * @route   GET /api/bookings/:id/history
 * @desc    Get booking check-in/out history
 * @access  Private
 */
router.get("/:id/history", getBookingHistory);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get single booking
 * @access  Private
 */
router.get("/:id", getBooking);

/**
 * @route   PUT /api/bookings/:id
 * @desc    Update booking
 * @access  Private (requires manage_bookings permission)
 */
router.put("/:id", checkPermission("manage_bookings"), updateBooking);

/**
 * @route   POST /api/bookings/:id/check-in
 * @desc    Perform guest check-in
 * @access  Private (requires manage_bookings permission)
 */
router.post(
  "/:id/check-in",
  checkPermission("manage_bookings"),
  performCheckIn,
);

/**
 * @route   POST /api/bookings/:id/check-out
 * @desc    Perform guest check-out
 * @access  Private (requires manage_bookings permission)
 */
router.post(
  "/:id/check-out",
  checkPermission("manage_bookings"),
  performCheckOut,
);

/**
 * @route   PATCH /api/bookings/:id/no-show
 * @desc    Mark booking as no-show
 * @access  Private (requires manage_bookings permission)
 */
router.patch("/:id/no-show", checkPermission("manage_bookings"), markNoShow);

/**
 * @route   PATCH /api/bookings/:id/cancel
 * @desc    Cancel booking
 * @access  Private (requires manage_bookings permission)
 */
router.patch("/:id/cancel", checkPermission("manage_bookings"), cancelBooking);

/**
 * @route   PATCH /api/bookings/:id/complete
 * @desc    Complete booking (checkout) - DEPRECATED, use /check-out instead
 * @access  Private (requires manage_bookings permission)
 */
router.patch(
  "/:id/complete",
  checkPermission("manage_bookings"),
  completeBooking,
);

module.exports = router;
