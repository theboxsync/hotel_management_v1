const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BookingSchema = new Schema({
  hotel_id: { type: String, required: true },

  // CHANGED: room_id → room_ids (array)
  room_ids: [{ type: String, required: true }], // Multiple rooms

  customer_name: { type: String, required: true },
  customer_email: { type: String, required: true },
  customer_phone: { type: String, required: true },

  // Expected dates
  check_in_date: { type: Date, required: true },
  check_out_date: { type: Date, required: true },

  // Actual check-in/out times
  actual_check_in: { type: Date },
  actual_check_out: { type: Date },

  // Check-in/out performed by
  checked_in_by: { type: String },
  checked_out_by: { type: String },

  guests_count: { type: Number, required: true },

  // NEW: Track number of rooms
  total_rooms: { type: Number, required: true, default: 1 },

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

  // NEW: Room breakdown for multi-room bookings
  room_breakdown: [
    {
      room_id: { type: String, required: true },
      room_number: { type: String },
      guests_in_room: { type: Number },
      price_per_night: { type: Number },
      nights: { type: Number },
      subtotal: { type: Number },
    }
  ],

  // Additional tracking
  early_check_in: { type: Boolean, default: false },
  late_check_out: { type: Boolean, default: false },
  extra_charges: { type: Number, default: 0 },
  extra_charges_description: { type: String },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Indexes
BookingSchema.index({ hotel_id: 1, check_in_date: 1, check_out_date: 1 });
BookingSchema.index({ booking_reference: 1 });
BookingSchema.index({ customer_email: 1 });
BookingSchema.index({ room_ids: 1 }); // NEW: Index for room_ids array

// Update timestamp
BookingSchema.pre("save", async function () {
  this.updated_at = new Date();
  return;
});

const Booking = mongoose.model("booking", BookingSchema);
module.exports = Booking;