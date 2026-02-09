const Booking = require("../models/Booking");
const PaymentTransaction = require("../models/PaymentTransaction");

/**
 * @desc    Add payment to booking
 * @route   POST /api/payments
 * @access  Private
 */
const addPayment = async (req, res) => {
    try {
        const {
            booking_id,
            amount,
            payment_method,
            transaction_id,
            reference_number,
            notes,
            payment_type = "booking",
        } = req.body;

        // Validation
        if (!booking_id || !amount || !payment_method) {
            return res.status(400).json({
                success: false,
                message: "Booking ID, amount, and payment method are required",
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Payment amount must be greater than 0",
            });
        }

        // Find booking
        const booking = await Booking.findOne({
            _id: booking_id,
            hotel_id: req.user.hotel_id,
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        // Check if booking is cancelled
        if (booking.booking_status === "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Cannot add payment to cancelled booking",
            });
        }

        // Calculate final amount (including extra charges)
        const finalAmount = booking.total_amount + (booking.extra_charges || 0);
        const currentPending = finalAmount - (booking.paid_amount || 0);

        // Check if payment exceeds pending amount
        if (amount > currentPending) {
            return res.status(400).json({
                success: false,
                message: `Payment amount (${amount}) exceeds pending amount (${currentPending})`,
            });
        }

        // Generate receipt number
        const receiptNumber = await generateReceiptNumber(req.user.hotel_id);

        // Create payment transaction
        const payment = new PaymentTransaction({
            hotel_id: req.user.hotel_id,
            booking_id,
            amount,
            payment_method,
            payment_date: new Date(),
            transaction_id,
            reference_number,
            notes,
            payment_type,
            payment_status: "success",
            processed_by: req.user.id,
            receipt_number: receiptNumber,
        });

        await payment.save();

        // Update booking paid amount
        booking.paid_amount = (booking.paid_amount || 0) + amount;
        await booking.save(); // Pre-save hook will update payment_status and pending_amount

        res.status(201).json({
            success: true,
            message: "Payment added successfully",
            data: {
                payment,
                booking: {
                    booking_reference: booking.booking_reference,
                    total_amount: finalAmount,
                    paid_amount: booking.paid_amount,
                    pending_amount: booking.pending_amount,
                    payment_status: booking.payment_status,
                },
            },
        });
    } catch (error) {
        console.error("Add payment error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while adding payment",
            error: error.message,
        });
    }
};

/**
 * @desc    Get payment history for a booking
 * @route   GET /api/payments/booking/:booking_id
 * @access  Private
 */
const getBookingPayments = async (req, res) => {
    try {
        const { booking_id } = req.params;

        // Verify booking exists and belongs to hotel
        const booking = await Booking.findOne({
            _id: booking_id,
            hotel_id: req.user.hotel_id,
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        // Get all payments for this booking
        const payments = await PaymentTransaction.find({
            booking_id,
            hotel_id: req.user.hotel_id,
        }).sort({ payment_date: -1 });

        // Calculate totals
        const totalPaid = payments
            .filter(p => p.payment_status === "success")
            .reduce((sum, p) => sum + p.amount, 0);

        const totalRefunded = payments
            .filter(p => p.payment_status === "refunded")
            .reduce((sum, p) => sum + p.amount, 0);

        const finalAmount = booking.total_amount + (booking.extra_charges || 0);
        const netPaid = totalPaid - totalRefunded;
        const pendingAmount = finalAmount - netPaid;

        res.status(200).json({
            success: true,
            data: {
                payments,
                summary: {
                    booking_reference: booking.booking_reference,
                    customer_name: booking.customer_name,
                    total_amount: finalAmount,
                    paid_amount: netPaid,
                    pending_amount: pendingAmount,
                    payment_status: booking.payment_status,
                    total_transactions: payments.length,
                    successful_payments: payments.filter(p => p.payment_status === "success").length,
                    refunded_payments: payments.filter(p => p.payment_status === "refunded").length,
                },
            },
        });
    } catch (error) {
        console.error("Get booking payments error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching payments",
            error: error.message,
        });
    }
};

/**
 * @desc    Refund a payment
 * @route   PUT /api/payments/:id/refund
 * @access  Private
 */
const refundPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const payment = await PaymentTransaction.findOne({
            _id: id,
            hotel_id: req.user.hotel_id,
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            });
        }

        if (payment.payment_status === "refunded") {
            return res.status(400).json({
                success: false,
                message: "Payment is already refunded",
            });
        }

        if (payment.payment_status !== "success") {
            return res.status(400).json({
                success: false,
                message: "Only successful payments can be refunded",
            });
        }

        // Update payment status
        payment.payment_status = "refunded";
        payment.notes = notes || payment.notes;
        await payment.save();

        // Update booking paid amount
        const booking = await Booking.findById(payment.booking_id);
        if (booking) {
            booking.paid_amount = Math.max(0, (booking.paid_amount || 0) - payment.amount);
            await booking.save(); // Pre-save hook will update payment_status
        }

        res.status(200).json({
            success: true,
            message: "Payment refunded successfully",
            data: {
                payment,
                booking: {
                    booking_reference: booking.booking_reference,
                    paid_amount: booking.paid_amount,
                    pending_amount: booking.pending_amount,
                    payment_status: booking.payment_status,
                },
            },
        });
    } catch (error) {
        console.error("Refund payment error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while refunding payment",
            error: error.message,
        });
    }
};

/**
 * @desc    Get all payments (with filters)
 * @route   GET /api/payments
 * @access  Private
 */
const getAllPayments = async (req, res) => {
    try {
        const { payment_method, payment_status, from_date, to_date } = req.query;

        const filter = { hotel_id: req.user.hotel_id };

        if (payment_method) filter.payment_method = payment_method;
        if (payment_status) filter.payment_status = payment_status;

        if (from_date || to_date) {
            filter.payment_date = {};
            if (from_date) filter.payment_date.$gte = new Date(from_date);
            if (to_date) filter.payment_date.$lte = new Date(to_date);
        }

        const payments = await PaymentTransaction.find(filter)
            .sort({ payment_date: -1 })
            .limit(100);

        // Get booking details for each payment
        const bookingIds = [...new Set(payments.map(p => p.booking_id))];
        const bookings = await Booking.find({ _id: { $in: bookingIds } });
        const bookingMap = {};
        bookings.forEach(b => {
            bookingMap[b._id] = {
                booking_reference: b.booking_reference,
                customer_name: b.customer_name,
            };
        });

        // Enrich payments with booking info
        const enrichedPayments = payments.map(p => ({
            ...p.toObject(),
            booking_info: bookingMap[p.booking_id] || {},
        }));

        // Calculate totals
        const totalAmount = payments
            .filter(p => p.payment_status === "success")
            .reduce((sum, p) => sum + p.amount, 0);

        const totalRefunded = payments
            .filter(p => p.payment_status === "refunded")
            .reduce((sum, p) => sum + p.amount, 0);

        res.status(200).json({
            success: true,
            data: {
                payments: enrichedPayments,
                summary: {
                    total_transactions: payments.length,
                    total_amount: totalAmount,
                    total_refunded: totalRefunded,
                    net_amount: totalAmount - totalRefunded,
                },
            },
        });
    } catch (error) {
        console.error("Get all payments error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching payments",
            error: error.message,
        });
    }
};

/**
 * @desc    Delete payment transaction (admin only)
 * @route   DELETE /api/payments/:id
 * @access  Private (Admin)
 */
const deletePayment = async (req, res) => {
    try {
        const { id } = req.params;

        const payment = await PaymentTransaction.findOne({
            _id: id,
            hotel_id: req.user.hotel_id,
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            });
        }

        // Update booking paid amount if payment was successful
        if (payment.payment_status === "success") {
            const booking = await Booking.findById(payment.booking_id);
            if (booking) {
                booking.paid_amount = Math.max(0, (booking.paid_amount || 0) - payment.amount);
                await booking.save();
            }
        }

        await payment.deleteOne();

        res.status(200).json({
            success: true,
            message: "Payment deleted successfully",
        });
    } catch (error) {
        console.error("Delete payment error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while deleting payment",
            error: error.message,
        });
    }
};

// Helper function to generate receipt number
const generateReceiptNumber = async (hotelId) => {
    const prefix = "RCP";
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${dateStr}-${random}`;
};

module.exports = {
    addPayment,
    getBookingPayments,
    refundPayment,
    getAllPayments,
    deletePayment,
};