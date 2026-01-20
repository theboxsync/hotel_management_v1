const Booking = require("../models/Booking");

/**
 * Generate unique booking reference
 * Format: HOTEL-YYYYMMDD-XXXX
 */
const generateBookingReference = async (hotel_id) => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

  // Get count of bookings today for this hotel
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const todayBookings = await Booking.countDocuments({
    hotel_id,
    created_at: { $gte: startOfDay, $lte: endOfDay },
  });

  const sequence = String(todayBookings + 1).padStart(4, "0");
  const hotelCode = hotel_id.slice(-4).toUpperCase();

  return `${hotelCode}-${dateStr}-${sequence}`;
};

/**
 * Calculate number of nights between two dates
 */
const calculateNights = (checkIn, checkOut) => {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const diffTime = Math.abs(checkOutDate - checkInDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Check if room is available for given dates
 */
const isRoomAvailable = async (
  room_id,
  checkInDate,
  checkOutDate,
  excludeBookingId = null,
) => {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  // Find overlapping bookings
  const query = {
    room_id,
    booking_status: { $in: ["confirmed"] }, // Only check confirmed bookings
    $or: [
      // New booking starts during existing booking
      {
        check_in_date: { $lte: checkIn },
        check_out_date: { $gt: checkIn },
      },
      // New booking ends during existing booking
      {
        check_in_date: { $lt: checkOut },
        check_out_date: { $gte: checkOut },
      },
      // New booking completely contains existing booking
      {
        check_in_date: { $gte: checkIn },
        check_out_date: { $lte: checkOut },
      },
    ],
  };

  // Exclude current booking when updating
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const overlappingBookings = await Booking.findOne(query);

  return !overlappingBookings; // True if no overlapping bookings found
};

/**
 * Calculate total amount based on room price and nights
 */
const calculateTotalAmount = (pricePerNight, nights, discountAmount = 0) => {
  const baseAmount = pricePerNight * nights;
  const totalAmount = baseAmount - discountAmount;
  return Math.max(totalAmount, 0); // Ensure non-negative
};

/**
 * Validate booking dates
 */
const validateBookingDates = (checkInDate, checkOutDate) => {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const errors = [];

  // Check if check-in is in the past
  if (checkIn < today) {
    errors.push("Check-in date cannot be in the past");
  }

  // Check if check-out is before check-in
  if (checkOut <= checkIn) {
    errors.push("Check-out date must be after check-in date");
  }

  // Check minimum stay (1 night)
  const nights = calculateNights(checkIn, checkOut);
  if (nights < 1) {
    errors.push("Minimum stay is 1 night");
  }

  // Check maximum stay (optional - 30 nights)
  if (nights > 30) {
    errors.push("Maximum stay is 30 nights");
  }

  return {
    isValid: errors.length === 0,
    errors,
    nights,
  };
};

/**
 * Get booking statistics for a date range
 */
const getBookingStats = async (hotel_id, startDate, endDate) => {
  const stats = await Booking.aggregate([
    {
      $match: {
        hotel_id,
        created_at: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      },
    },
    {
      $group: {
        _id: "$booking_status",
        count: { $sum: 1 },
        totalRevenue: { $sum: "$total_amount" },
      },
    },
  ]);

  return stats;
};

/**
 * Check for conflicting bookings
 */
const getConflictingBookings = async (
  hotel_id,
  checkInDate,
  checkOutDate,
  excludeBookingId = null,
) => {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  const query = {
    hotel_id,
    booking_status: "confirmed",
    $or: [
      {
        check_in_date: { $lte: checkIn },
        check_out_date: { $gt: checkIn },
      },
      {
        check_in_date: { $lt: checkOut },
        check_out_date: { $gte: checkOut },
      },
      {
        check_in_date: { $gte: checkIn },
        check_out_date: { $lte: checkOut },
      },
    ],
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return await Booking.find(query).select(
    "room_id check_in_date check_out_date",
  );
};

module.exports = {
  generateBookingReference,
  calculateNights,
  isRoomAvailable,
  calculateTotalAmount,
  validateBookingDates,
  getBookingStats,
  getConflictingBookings,
};
