const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PaymentTransactionSchema = new Schema({
    hotel_id: { type: String, required: true },
    booking_id: { type: String, required: true },

    // Payment details
    amount: { type: Number, required: true },
    payment_method: {
        type: String,
        enum: ["cash", "card", "upi", "online", "bank_transfer", "cheque"],
        required: true,
    },
    payment_date: { type: Date, default: Date.now },

    // Transaction info
    transaction_id: { type: String }, // For online/card payments
    reference_number: { type: String }, // For cheque/bank transfer
    payment_status: {
        type: String,
        enum: ["success", "pending", "failed", "refunded"],
        default: "success",
    },

    // Additional details
    notes: { type: String },
    payment_type: {
        type: String,
        enum: ["booking", "advance", "settlement", "refund", "extra_charge"],
        default: "booking",
    },

    // Processing info
    processed_by: { type: String }, // Admin/Staff ID who processed payment
    payment_gateway: { type: String }, // If online payment (razorpay, stripe, etc.)

    // Receipt
    receipt_number: { type: String },
    receipt_url: { type: String },

    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

// Indexes
PaymentTransactionSchema.index({ hotel_id: 1, booking_id: 1 });
PaymentTransactionSchema.index({ receipt_number: 1 });
PaymentTransactionSchema.index({ payment_date: 1 });

// Update timestamp
PaymentTransactionSchema.pre("save", function () {
    this.updated_at = new Date();
});

const PaymentTransaction = mongoose.model("payment_transaction", PaymentTransactionSchema);
module.exports = PaymentTransaction;