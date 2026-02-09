const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/Authmiddleware");
const {
    addPayment,
    getBookingPayments,
    refundPayment,
    getAllPayments,
    deletePayment,
} = require("../controllers/Paymentcontroller");

// All routes require authentication
router.use(authenticate);

/**
 * Payment Routes
 */

/**
 * @route   GET /api/payments
 * @desc    Get all payments (with filters)
 * @access  Private
 */
router.get("/", getAllPayments);

/**
 * @route   POST /api/payments
 * @desc    Add new payment
 * @access  Private
 */
router.post("/", addPayment);

/**
 * @route   GET /api/payments/booking/:booking_id
 * @desc    Get all payments for a specific booking
 * @access  Private
 */
router.get("/booking/:booking_id", getBookingPayments);

/**
 * @route   PUT /api/payments/:id/refund
 * @desc    Refund a payment
 * @access  Private
 */
router.put("/refund/:id", refundPayment);

/**
 * @route   DELETE /api/payments/:id
 * @desc    Delete a payment record
 * @access  Private
 */
router.delete("/:id", deletePayment);

module.exports = router;