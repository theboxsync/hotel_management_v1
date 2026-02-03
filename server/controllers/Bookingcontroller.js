const Booking = require("../models/Booking");
const Room = require("../models/Room");
const RoomCategory = require("../models/RoomCategory");
const {
  generateBookingReference,
  calculateNights,
  isRoomAvailable,
  calculateTotalAmount,
  validateBookingDates,
  getBookingStats,
  getConflictingBookings,
} = require("../utils/Bookingutils");

/**
 * @desc    Create new booking
 * @route   POST /api/bookings
 * @access  Private
 */
const createBooking = async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      check_in_date,
      check_out_date,
      guests_count,
      booking_source,
      special_requests,
      payment_method,
      coupon_code,
      discount_amount,
      room_ids, // Changed from room_id to room_ids (array)
      split_guests, // Optional: array of guests per room
    } = req.body;

    // Validation
    if (
      !room_ids ||
      !Array.isArray(room_ids) ||
      room_ids.length === 0 ||
      !customer_name ||
      !customer_email ||
      !customer_phone ||
      !check_in_date ||
      !check_out_date ||
      !guests_count
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Validate booking dates
    const dateValidation = validateBookingDates(check_in_date, check_out_date);
    if (!dateValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking dates",
        errors: dateValidation.errors,
      });
    }

    const nights = dateValidation.nights;
    const hotel_id = req.user.hotel_id;

    // Arrays to store room details and bookings
    const roomDetails = [];
    const bookings = [];
    let total_amount = 0;

    // Validate each room
    for (const room_id of room_ids) {
      // Verify room exists and belongs to this hotel
      const room = await Room.findOne({
        _id: room_id,
        hotel_id: hotel_id,
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: `Room ${room_id} not found`,
        });
      }

      // Check if room is available (not in maintenance or out of order)
      if (room.status === "maintenance" || room.status === "out_of_order") {
        return res.status(400).json({
          success: false,
          message: `Room ${room.room_number} is currently ${room.status} and cannot be booked`,
        });
      }

      // Get room category for occupancy check
      const category = await RoomCategory.findById(room.category_id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Room category not found",
        });
      }

      // Check room availability for the dates
      const available = await isRoomAvailable(
        room_id,
        check_in_date,
        check_out_date,
      );

      if (!available) {
        return res.status(409).json({
          success: false,
          message: `Room ${room.room_number} is not available for the selected dates`,
        });
      }

      // Store room details
      roomDetails.push({
        room_id: room._id,
        room_number: room.room_number,
        floor: room.floor,
        category_name: category.category_name,
        price_per_night: room.current_price,
        max_occupancy: category.max_occupancy,
      });

      // Calculate room amount
      const room_amount = calculateTotalAmount(
        room.current_price,
        nights,
        0 // No discount per room, discount applies to total
      );
      total_amount += room_amount;
    }

    // Apply discount to total amount
    total_amount = Math.max(0, total_amount - (discount_amount || 0));

    // Generate booking reference
    const booking_reference = await generateBookingReference(hotel_id);

    // Create booking for each room
    for (const roomDetail of roomDetails) {
      const booking = new Booking({
        hotel_id: hotel_id,
        room_id: roomDetail.room_id,
        customer_name,
        customer_email,
        customer_phone,
        check_in_date: new Date(check_in_date),
        check_out_date: new Date(check_out_date),
        guests_count: guests_count, // Total guests, or you could split per room
        total_amount: roomDetail.price_per_night * nights,
        booking_status: "confirmed",
        booking_source: booking_source || "direct",
        special_requests: special_requests || "",
        payment_method: payment_method || null,
        payment_status: payment_method ? "paid" : "pending",
        discount_amount: 0, // No discount per room
        coupon_code: coupon_code || null,
        booking_reference: `${booking_reference}-${roomDetail.room_number}`, // Unique ref per room
        parent_booking_reference: booking_reference, // Main reference
        is_group_booking: room_ids.length > 1,
      });

      const savedBooking = await booking.save();
      bookings.push(savedBooking);
    }

    res.status(201).json({
      success: true,
      message: `Booking created successfully for ${room_ids.length} room(s)`,
      data: {
        booking_reference,
        bookings: bookings,
        room_details: roomDetails,
        booking_summary: {
          nights,
          total_rooms: room_ids.length,
          subtotal: total_amount + (discount_amount || 0),
          discount: discount_amount || 0,
          total: total_amount,
        },
      },
    });

    console.log(`Booking confirmation email sent to: ${customer_email}`);
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating booking",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all bookings for hotel
 * @route   GET /api/bookings
 * @access  Private
 */
const getBookings = async (req, res) => {
  try {
    const {
      status,
      source,
      payment_status,
      start_date,
      end_date,
      room_id,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    // Build filter
    const filter = { hotel_id: req.user.hotel_id };

    if (status) filter.booking_status = status;
    if (source) filter.booking_source = source;
    if (payment_status) filter.payment_status = payment_status;
    if (room_id) filter.room_id = room_id;

    // Date range filter
    if (start_date || end_date) {
      filter.check_in_date = {};
      if (start_date) filter.check_in_date.$gte = new Date(start_date);
      if (end_date) filter.check_in_date.$lte = new Date(end_date);
    }

    // Search by customer name, email, or booking reference
    if (search) {
      filter.$or = [
        { customer_name: { $regex: search, $options: "i" } },
        { customer_email: { $regex: search, $options: "i" } },
        { booking_reference: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await Booking.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalBookings = await Booking.countDocuments(filter);

    // Populate with room details
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const room = await Room.findById(booking.room_id);
        const category = room
          ? await RoomCategory.findById(room.category_id)
          : null;

        return {
          ...booking.toObject(),
          room_details: room
            ? {
              room_number: room.room_number,
              floor: room.floor,
              category_name: category?.category_name,
            }
            : null,
        };
      }),
    );

    res.status(200).json({
      success: true,
      count: bookingsWithDetails.length,
      total: totalBookings,
      page: parseInt(page),
      pages: Math.ceil(totalBookings / parseInt(limit)),
      data: bookingsWithDetails,
    });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching bookings",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single booking
 * @route   GET /api/bookings/:id
 * @access  Private
 */
const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      hotel_id: req.user.hotel_id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Get room and category details
    const room = await Room.findById(booking.room_id);
    const category = room
      ? await RoomCategory.findById(room.category_id)
      : null;

    const nights = calculateNights(
      booking.check_in_date,
      booking.check_out_date,
    );

    res.status(200).json({
      success: true,
      data: {
        booking,
        room_details: room
          ? {
            room_number: room.room_number,
            floor: room.floor,
            category_name: category?.category_name,
            amenities: category?.amenities,
          }
          : null,
        booking_summary: {
          nights,
          price_per_night: room?.current_price,
          subtotal: (room?.current_price || 0) * nights,
          discount: booking.discount_amount,
          total: booking.total_amount,
        },
      },
    });
  } catch (error) {
    console.error("Get booking error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching booking",
      error: error.message,
    });
  }
};

/**
 * @desc    Get booking by reference number
 * @route   GET /api/bookings/reference/:reference
 * @access  Private
 */
const getBookingByReference = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      booking_reference: req.params.reference,
      hotel_id: req.user.hotel_id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const room = await Room.findById(booking.room_id);
    const category = room
      ? await RoomCategory.findById(room.category_id)
      : null;

    res.status(200).json({
      success: true,
      data: {
        booking,
        room_details: room
          ? {
            room_number: room.room_number,
            floor: room.floor,
            category_name: category?.category_name,
          }
          : null,
      },
    });
  } catch (error) {
    console.error("Get booking by reference error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching booking",
      error: error.message,
    });
  }
};

/**
 * @desc    Update booking
 * @route   PUT /api/bookings/:id
 * @access  Private
 */
const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      hotel_id: req.user.hotel_id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Don't allow updates to completed or cancelled bookings
    if (booking.booking_status === "checked_out") {
      return res.status(400).json({
        success: false,
        message: "Cannot update completed booking",
      });
    }

    if (booking.booking_status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot update cancelled booking",
      });
    }

    if (booking.booking_status === "no_show") {
      return res.status(400).json({
        success: false,
        message: "Cannot update no-show booking",
      });
    }

    const {
      customer_name,
      customer_email,
      customer_phone,
      check_in_date,
      check_out_date,
      guests_count,
      special_requests,
      payment_status,
      payment_method,
    } = req.body;

    // If dates are being updated, validate and check availability
    if (check_in_date || check_out_date) {
      const newCheckIn = check_in_date || booking.check_in_date;
      const newCheckOut = check_out_date || booking.check_out_date;

      const dateValidation = validateBookingDates(newCheckIn, newCheckOut);
      if (!dateValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking dates",
          errors: dateValidation.errors,
        });
      }

      // Check availability excluding current booking
      const available = await isRoomAvailable(
        booking.room_id,
        newCheckIn,
        newCheckOut,
        booking._id,
      );

      if (!available) {
        return res.status(409).json({
          success: false,
          message: "Room is not available for the new dates",
        });
      }

      booking.check_in_date = new Date(newCheckIn);
      booking.check_out_date = new Date(newCheckOut);

      // Recalculate total amount
      const room = await Room.findById(booking.room_id);
      const nights = dateValidation.nights;
      booking.total_amount = calculateTotalAmount(
        room.current_price,
        nights,
        booking.discount_amount,
      );
    }

    // Update guest count if provided
    if (guests_count !== undefined) {
      const room = await Room.findById(booking.room_id);
      const category = await RoomCategory.findById(room.category_id);

      if (guests_count > category.max_occupancy) {
        return res.status(400).json({
          success: false,
          message: `Maximum occupancy for this room is ${category.max_occupancy} guests`,
        });
      }

      booking.guests_count = guests_count;
    }

    // Update other fields
    if (customer_name) booking.customer_name = customer_name;
    if (customer_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer_email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }
      booking.customer_email = customer_email;
    }
    if (customer_phone) booking.customer_phone = customer_phone;
    if (special_requests !== undefined)
      booking.special_requests = special_requests;
    if (payment_status) booking.payment_status = payment_status;
    if (payment_method) booking.payment_method = payment_method;

    const updatedBooking = await booking.save();

    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      data: updatedBooking,
    });
  } catch (error) {
    console.error("Update booking error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating booking",
      error: error.message,
    });
  }
};

/**
 * @desc    Cancel booking
 * @route   PATCH /api/bookings/:id/cancel
 * @access  Private
 */
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      hotel_id: req.user.hotel_id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.booking_status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Booking is already cancelled",
      });
    }

    if (booking.booking_status === "checked_out") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel completed booking",
      });
    }

    if (booking.booking_status === "checked_in") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot cancel booking - guest is currently checked in. Please check-out first.",
      });
    }

    booking.booking_status = "cancelled";

    // If payment was made, mark for refund
    if (booking.payment_status === "paid") {
      booking.payment_status = "refunded";
    }

    await booking.save();

    // Update room status if currently occupied
    const room = await Room.findById(booking.room_id);
    if (room && room.status === "occupied") {
      room.status = "available";
      await room.save();
    }

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });

    // TODO: Send cancellation email
    console.log(
      `Cancellation email should be sent to: ${booking.customer_email}`,
    );
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while cancelling booking",
      error: error.message,
    });
  }
};

/**
 * @desc    Complete booking (checkout)
 * @route   PATCH /api/bookings/:id/complete
 * @access  Private
 */
const completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      hotel_id: req.user.hotel_id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.booking_status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot complete cancelled booking",
      });
    }

    if (booking.booking_status === "checked_out") {
      return res.status(400).json({
        success: false,
        message: "Booking is already completed",
      });
    }

    // This is a legacy endpoint - recommend using /check-out instead
    booking.booking_status = "checked_out";
    booking.actual_check_out = new Date();
    booking.checked_out_by = req.user._id.toString();
    await booking.save();

    // Update room status to available
    const room = await Room.findById(booking.room_id);
    if (room) {
      room.status = "available";
      await room.save();
    }

    res.status(200).json({
      success: true,
      message: "Booking completed successfully. Guest checked out.",
      data: booking,
    });

    // TODO: Send checkout/feedback email
    console.log(`Checkout email should be sent to: ${booking.customer_email}`);
  } catch (error) {
    console.error("Complete booking error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while completing booking",
      error: error.message,
    });
  }
};

/**
 * @desc    Check room availability
 * @route   POST /api/bookings/check-availability
 * @access  Private
 */
const checkAvailability = async (req, res) => {
  try {
    const { room_id, check_in_date, check_out_date } = req.body;

    if (!room_id || !check_in_date || !check_out_date) {
      return res.status(400).json({
        success: false,
        message: "Room ID, check-in date, and check-out date are required",
      });
    }

    // Verify room belongs to hotel
    const room = await Room.findOne({
      _id: room_id,
      hotel_id: req.user.hotel_id,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Validate dates
    const dateValidation = validateBookingDates(check_in_date, check_out_date);
    if (!dateValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid dates",
        errors: dateValidation.errors,
        available: false,
      });
    }

    // Check availability
    const available = await isRoomAvailable(
      room_id,
      check_in_date,
      check_out_date,
    );

    const nights = dateValidation.nights;
    const totalAmount = room.current_price * nights;

    res.status(200).json({
      success: true,
      available,
      data: {
        room_number: room.room_number,
        room_status: room.status,
        nights,
        price_per_night: room.current_price,
        estimated_total: totalAmount,
      },
    });
  } catch (error) {
    console.error("Check availability error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while checking availability",
      error: error.message,
    });
  }
};

/**
 * @desc    Get booking statistics
 * @route   GET /api/bookings/stats
 * @access  Private
 */
const getBookingStatistics = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const startDate = start_date
      ? new Date(start_date)
      : new Date(new Date().setDate(1)); // First day of current month
    const endDate = end_date ? new Date(end_date) : new Date(); // Today

    // Get booking statistics
    const stats = await getBookingStats(req.user.hotel_id, startDate, endDate);

    // Get total bookings
    const totalBookings = await Booking.countDocuments({
      hotel_id: req.user.hotel_id,
      created_at: { $gte: startDate, $lte: endDate },
    });

    // Get revenue breakdown
    const revenueBreakdown = await Booking.aggregate([
      {
        $match: {
          hotel_id: req.user.hotel_id,
          created_at: { $gte: startDate, $lte: endDate },
          booking_status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: "$booking_source",
          count: { $sum: 1 },
          revenue: { $sum: "$total_amount" },
        },
      },
    ]);

    // Calculate occupancy rate
    const totalRooms = await Room.countDocuments({
      hotel_id: req.user.hotel_id,
    });

    const totalNights = Math.ceil(
      (endDate - startDate) / (1000 * 60 * 60 * 24),
    );
    const totalRoomNights = totalRooms * totalNights;

    const bookedNights = await Booking.aggregate([
      {
        $match: {
          hotel_id: req.user.hotel_id,
          booking_status: "confirmed",
          check_in_date: { $lte: endDate },
          check_out_date: { $gte: startDate },
        },
      },
      {
        $project: {
          nights: {
            $divide: [
              { $subtract: ["$check_out_date", "$check_in_date"] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalNights: { $sum: "$nights" },
        },
      },
    ]);

    const occupancyRate =
      totalRoomNights > 0
        ? ((bookedNights[0]?.totalNights || 0) / totalRoomNights) * 100
        : 0;

    res.status(200).json({
      success: true,
      data: {
        period: {
          start_date: startDate,
          end_date: endDate,
        },
        total_bookings: totalBookings,
        booking_status_breakdown: stats,
        revenue_by_source: revenueBreakdown,
        occupancy_rate: occupancyRate.toFixed(2) + "%",
        total_rooms: totalRooms,
      },
    });
  } catch (error) {
    console.error("Get booking statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching statistics",
      error: error.message,
    });
  }
};

/**
 * @desc    Get upcoming check-ins
 * @route   GET /api/bookings/upcoming-checkins
 * @access  Private
 */
const getUpcomingCheckIns = async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));
    futureDate.setHours(23, 59, 59, 999);

    const upcomingBookings = await Booking.find({
      hotel_id: req.user.hotel_id,
      booking_status: "confirmed",
      check_in_date: { $gte: today, $lte: futureDate },
    }).sort({ check_in_date: 1 });

    // Populate with room details
    const bookingsWithDetails = await Promise.all(
      upcomingBookings.map(async (booking) => {
        const room = await Room.findById(booking.room_id);
        const category = room
          ? await RoomCategory.findById(room.category_id)
          : null;

        return {
          ...booking.toObject(),
          room_details: room
            ? {
              room_number: room.room_number,
              floor: room.floor,
              category_name: category?.category_name,
            }
            : null,
        };
      }),
    );

    res.status(200).json({
      success: true,
      count: bookingsWithDetails.length,
      data: bookingsWithDetails,
    });
  } catch (error) {
    console.error("Get upcoming check-ins error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching upcoming check-ins",
      error: error.message,
    });
  }
};

/**
 * @desc    Get upcoming check-outs
 * @route   GET /api/bookings/upcoming-checkouts
 * @access  Private
 */
const getUpcomingCheckOuts = async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));
    futureDate.setHours(23, 59, 59, 999);

    const upcomingCheckouts = await Booking.find({
      hotel_id: req.user.hotel_id,
      booking_status: "confirmed",
      check_out_date: { $gte: today, $lte: futureDate },
    }).sort({ check_out_date: 1 });

    // Populate with room details
    const bookingsWithDetails = await Promise.all(
      upcomingCheckouts.map(async (booking) => {
        const room = await Room.findById(booking.room_id);
        const category = room
          ? await RoomCategory.findById(room.category_id)
          : null;

        return {
          ...booking.toObject(),
          room_details: room
            ? {
              room_number: room.room_number,
              floor: room.floor,
              category_name: category?.category_name,
            }
            : null,
        };
      }),
    );

    res.status(200).json({
      success: true,
      count: bookingsWithDetails.length,
      data: bookingsWithDetails,
    });
  } catch (error) {
    console.error("Get upcoming check-outs error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching upcoming check-outs",
      error: error.message,
    });
  }
};

module.exports = {
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
};
