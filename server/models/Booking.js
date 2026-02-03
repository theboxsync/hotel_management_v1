const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BookingSchema = new Schema({
  hotel_id: { type: String, required: true },
  room_id: { type: String, required: true },
  customer_name: { type: String, required: true },
  customer_email: { type: String, required: true },
  customer_phone: { type: String, required: true },

  // Expected dates (when booking is made)
  check_in_date: { type: Date, required: true },
  check_out_date: { type: Date, required: true },

  // Actual check-in/check-out times (when guest arrives/leaves)
  actual_check_in: { type: Date },
  actual_check_out: { type: Date },

  // Check-in/out performed by
  checked_in_by: { type: String }, // Staff/Admin ID
  checked_out_by: { type: String }, // Staff/Admin ID

  guests_count: { type: Number, required: true },
  total_amount: { type: Number, required: true },
  booking_status: {
    type: String,
    enum: ["confirmed", "checked_in", "checked_out", "cancelled", "no_show"],
    default: "confirmed",
  },
  booking_source: {
    type: String,
    enum: ["direct", "booking.com", "makemytrip", "walk_in"],
    default: "direct",
  },
  special_requests: { type: String },
  payment_status: {
    type: String,
    enum: ["pending", "paid", "refunded", "partial"],
    default: "pending",
  },
  payment_method: {
    type: String,
    enum: ["cash", "card", "upi", "online"],
  },
  discount_amount: { type: Number, default: 0 },
  coupon_code: { type: String },
  booking_reference: { type: String, unique: true },
  parent_booking_reference: { type: String }, 
  is_group_booking: { type: Boolean, default: false },
  group_booking_id: { type: String }, 

  // Additional tracking
  early_check_in: { type: Boolean, default: false },
  late_check_out: { type: Boolean, default: false },
  extra_charges: { type: Number, default: 0 },
  extra_charges_description: { type: String },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Create index for efficient queries
BookingSchema.index({ hotel_id: 1, check_in_date: 1, check_out_date: 1 });
BookingSchema.index({ booking_reference: 1 });
BookingSchema.index({ customer_email: 1 });

BookingSchema.index({ parent_booking_reference: 1 });
BookingSchema.index({ is_group_booking: 1 });

// Update timestamp on save
BookingSchema.pre("save", async function () {
  this.updated_at = new Date();
  return;
});

const Booking = mongoose.model("booking", BookingSchema);
module.exports = Booking;
