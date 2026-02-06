const Booking = require("../models/Booking");
const Room = require("../models/Room");
const RoomCategory = require("../models/RoomCategory");
const { calculateNights } = require("../utils/Bookingutils");

/**
 * @desc    Perform check-in (when guest actually arrives)
 * @route   POST /api/bookings/:id/check-in
 * @access  Private
 */
const performCheckIn = async (req, res) => {
  try {
    const {
      payment_method,
      payment_status,
      extra_charges,
      extra_charges_description,
      notes,
    } = req.body;

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

    // ❌ Status validations
    if (booking.booking_status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot check-in cancelled booking",
      });
    }

    if (booking.booking_status === "checked_in") {
      return res.status(400).json({
        success: false,
        message: "Guest already checked in",
        actual_check_in: booking.actual_check_in,
      });
    }

    if (booking.booking_status === "checked_out") {
      return res.status(400).json({
        success: false,
        message: "Booking already completed",
      });
    }

    // ✅ Perform check-in
    const now = new Date();
    booking.actual_check_in = now;
    booking.booking_status = "checked_in";
    booking.checked_in_by = req.user._id.toString();

    // Early check-in detection
    const expected = new Date(booking.check_in_date);
    expected.setHours(0, 0, 0, 0);
    const actual = new Date(now);
    actual.setHours(0, 0, 0, 0);

    if (actual < expected) booking.early_check_in = true;

    // Payment updates
    if (payment_method) booking.payment_method = payment_method;
    if (payment_status) booking.payment_status = payment_status;

    // Extra charges
    if (extra_charges) {
      booking.extra_charges = extra_charges;
      booking.extra_charges_description =
        extra_charges_description || "Additional charges";
    }

    // Notes
    if (notes) {
      booking.special_requests = booking.special_requests
        ? `${booking.special_requests}\n\nCheck-in Notes: ${notes}`
        : `Check-in Notes: ${notes}`;
    }

    await booking.save();

    // 🏨 Update ALL rooms to occupied
    await Room.updateMany(
      { _id: { $in: booking.room_ids } },
      { $set: { status: "occupied" } }
    );

    // 🔍 Fetch room details
    const rooms = await Room.find({ _id: { $in: booking.room_ids } });

    const roomDetails = await Promise.all(
      rooms.map(async (room) => {
        const category = await RoomCategory.findById(room.category_id);
        return {
          room_id: room._id,
          room_number: room.room_number,
          floor: room.floor,
          category_name: category?.category_name,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "Check-in completed successfully",
      data: {
        booking_id: booking._id,
        booking_reference: booking.booking_reference,
        customer_name: booking.customer_name,
        expected_check_in: booking.check_in_date,
        actual_check_in: booking.actual_check_in,
        early_check_in: booking.early_check_in,
        total_rooms: booking.total_rooms,
        rooms: roomDetails,
        total_amount: booking.total_amount,
        extra_charges: booking.extra_charges,
        grand_total: booking.total_amount + booking.extra_charges,
        payment_status: booking.payment_status,
      },
    });

    console.log(
      `Check-in confirmation should be sent to: ${booking.customer_email}`
    );
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during check-in",
      error: error.message,
    });
  }
};

/**
 * @desc    Perform check-out (when guest actually leaves)
 * @route   POST /api/bookings/:id/check-out
 * @access  Private
 */
const performCheckOut = async (req, res) => {
  try {
    const {
      payment_status,
      extra_charges,
      extra_charges_description,
      final_payment_method,
      feedback_rating,
      feedback_comments,
    } = req.body;

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

    // ❌ Status checks
    if (booking.booking_status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot check-out cancelled booking",
      });
    }

    if (booking.booking_status === "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Guest has not checked in yet",
      });
    }

    if (booking.booking_status === "checked_out") {
      return res.status(400).json({
        success: false,
        message: "Guest already checked out",
        actual_check_out: booking.actual_check_out,
      });
    }

    // ✅ Perform checkout
    const now = new Date();
    booking.actual_check_out = now;
    booking.booking_status = "checked_out";
    booking.checked_out_by = req.user._id.toString();

    // Late checkout detection (12 PM rule)
    const expectedCheckOut = new Date(booking.check_out_date);
    expectedCheckOut.setHours(12, 0, 0, 0);

    if (now > expectedCheckOut) {
      booking.late_check_out = true;
    }

    // Payment updates
    if (payment_status) booking.payment_status = payment_status;
    if (final_payment_method)
      booking.payment_method = final_payment_method;

    // Extra charges
    if (extra_charges) {
      booking.extra_charges += extra_charges;
      const desc =
        extra_charges_description || "Additional checkout charges";
      booking.extra_charges_description = booking.extra_charges_description
        ? `${booking.extra_charges_description}; ${desc}`
        : desc;
    }

    // Optional feedback storage (if fields exist later)
    if (feedback_rating) booking.feedback_rating = feedback_rating;
    if (feedback_comments)
      booking.feedback_comments = feedback_comments;

    await booking.save();

    // 🏨 Free ALL rooms
    await Room.updateMany(
      { _id: { $in: booking.room_ids } },
      { $set: { status: "available" } }
    );

    // 🔍 Fetch room details
    const rooms = await Room.find({ _id: { $in: booking.room_ids } });

    const roomDetails = await Promise.all(
      rooms.map(async (room) => {
        const category = await RoomCategory.findById(room.category_id);
        return {
          room_id: room._id,
          room_number: room.room_number,
          floor: room.floor,
          category_name: category?.category_name,
        };
      })
    );

    // 🧮 Calculate actual nights stayed
    const actualNights =
      booking.actual_check_in && booking.actual_check_out
        ? Math.max(
          1,
          Math.ceil(
            (booking.actual_check_out - booking.actual_check_in) /
            (1000 * 60 * 60 * 24)
          )
        )
        : calculateNights(
          booking.check_in_date,
          booking.check_out_date
        );

    res.status(200).json({
      success: true,
      message: "Check-out completed successfully",
      data: {
        booking_id: booking._id,
        booking_reference: booking.booking_reference,
        customer_name: booking.customer_name,
        actual_check_in: booking.actual_check_in,
        expected_check_out: booking.check_out_date,
        actual_check_out: booking.actual_check_out,
        late_check_out: booking.late_check_out,
        actual_nights_stayed: actualNights,
        total_rooms: booking.total_rooms,
        rooms: roomDetails,
        billing: {
          room_charges: booking.total_amount,
          extra_charges: booking.extra_charges,
          extra_charges_description:
            booking.extra_charges_description,
          grand_total:
            booking.total_amount + booking.extra_charges,
          payment_status: booking.payment_status,
          payment_method: booking.payment_method,
        },
      },
    });

    console.log(
      `Checkout confirmation & feedback request should be sent to: ${booking.customer_email}`
    );
  } catch (error) {
    console.error("Check-out error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during check-out",
      error: error.message,
    });
  }
};

/**
 * @desc    Get current checked-in guests
 * @route   GET /api/bookings/checked-in
 * @access  Private
 */
const getCurrentlyCheckedIn = async (req, res) => {
  try {
    const bookings = await Booking.find({
      hotel_id: req.user.hotel_id,
      booking_status: "checked_in",
    }).sort({ actual_check_in: -1 });

    // Populate with room details
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const room = await Room.findById(booking.room_id);
        const category = room
          ? await RoomCategory.findById(room.category_id)
          : null;

        // Calculate how long they've been staying
        const stayDuration = booking.actual_check_in
          ? Math.floor(
            (new Date() - booking.actual_check_in) / (1000 * 60 * 60 * 24),
          )
          : 0;

        return {
          ...booking.toObject(),
          room_details: room
            ? {
              room_number: room.room_number,
              floor: room.floor,
              category_name: category?.category_name,
            }
            : null,
          stay_duration_days: stayDuration,
        };
      }),
    );

    res.status(200).json({
      success: true,
      count: bookingsWithDetails.length,
      data: bookingsWithDetails,
    });
  } catch (error) {
    console.error("Get checked-in guests error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching checked-in guests",
      error: error.message,
    });
  }
};

/**
 * @desc    Mark booking as no-show
 * @route   PATCH /api/bookings/:id/no-show
 * @access  Private
 */
const markNoShow = async (req, res) => {
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

    if (booking.booking_status === "checked_in") {
      return res.status(400).json({
        success: false,
        message: "Guest has already checked in",
      });
    }

    if (booking.booking_status === "checked_out") {
      return res.status(400).json({
        success: false,
        message: "Booking already completed",
      });
    }

    // Mark as no-show
    booking.booking_status = "no_show";

    // Apply no-show penalty (you can customize this)
    // For example, charge 50% or keep the deposit
    if (booking.payment_status === "pending") {
      booking.payment_status = "pending"; // or "partial" if you charge penalty
    }

    await booking.save();

    // Make room available again
    const room = await Room.findById(booking.room_id);
    if (room && room.status === "occupied") {
      room.status = "available";
      await room.save();
    }

    res.status(200).json({
      success: true,
      message: "Booking marked as no-show",
      data: booking,
    });

    // TODO: Send no-show notification
    console.log(
      `No-show notification should be sent to: ${booking.customer_email}`,
    );
  } catch (error) {
    console.error("Mark no-show error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while marking no-show",
      error: error.message,
    });
  }
};

/**
 * @desc    Get check-in/check-out history
 * @route   GET /api/bookings/:id/history
 * @access  Private
 */
const getBookingHistory = async (req, res) => {
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

    const room = await Room.findById(booking.room_id);
    const category = room
      ? await RoomCategory.findById(room.category_id)
      : null;

    // Calculate durations
    let expectedDuration = null;
    let actualDuration = null;

    if (booking.check_in_date && booking.check_out_date) {
      expectedDuration = calculateNights(
        booking.check_in_date,
        booking.check_out_date,
      );
    }

    if (booking.actual_check_in && booking.actual_check_out) {
      actualDuration = Math.ceil(
        (booking.actual_check_out - booking.actual_check_in) /
        (1000 * 60 * 60 * 24),
      );
    }

    const history = {
      booking_reference: booking.booking_reference,
      customer_name: booking.customer_name,
      room_details: room
        ? {
          room_number: room.room_number,
          floor: room.floor,
          category_name: category?.category_name,
        }
        : null,

      timeline: {
        booking_created: booking.created_at,

        expected_check_in: booking.check_in_date,
        actual_check_in: booking.actual_check_in,
        checked_in_by: booking.checked_in_by,
        early_check_in: booking.early_check_in,

        expected_check_out: booking.check_out_date,
        actual_check_out: booking.actual_check_out,
        checked_out_by: booking.checked_out_by,
        late_check_out: booking.late_check_out,
      },

      duration: {
        expected_nights: expectedDuration,
        actual_nights: actualDuration,
        difference:
          actualDuration && expectedDuration
            ? actualDuration - expectedDuration
            : null,
      },

      status: booking.booking_status,

      financial: {
        room_charges: booking.total_amount,
        extra_charges: booking.extra_charges,
        extra_charges_description: booking.extra_charges_description,
        discount: booking.discount_amount,
        grand_total: booking.total_amount + booking.extra_charges,
        payment_status: booking.payment_status,
        payment_method: booking.payment_method,
      },
    };

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Get booking history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching booking history",
      error: error.message,
    });
  }
};

/**
 * @desc    Get today's check-ins (expected)
 * @route   GET /api/bookings/today/check-ins
 * @access  Private
 */
const getTodayCheckIns = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bookings = await Booking.find({
      hotel_id: req.user.hotel_id,
      check_in_date: { $gte: today, $lt: tomorrow },
      booking_status: { $in: ["confirmed", "checked_in"] },
    }).sort({ check_in_date: 1 });

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
          is_checked_in: booking.booking_status === "checked_in",
        };
      }),
    );

    res.status(200).json({
      success: true,
      count: bookingsWithDetails.length,
      checked_in_count: bookingsWithDetails.filter((b) => b.is_checked_in)
        .length,
      pending_count: bookingsWithDetails.filter((b) => !b.is_checked_in).length,
      data: bookingsWithDetails,
    });
  } catch (error) {
    console.error("Get today's check-ins error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching today's check-ins",
      error: error.message,
    });
  }
};

/**
 * @desc    Get today's check-outs (expected)
 * @route   GET /api/bookings/today/check-outs
 * @access  Private
 */
const getTodayCheckOuts = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bookings = await Booking.find({
      hotel_id: req.user.hotel_id,
      check_out_date: { $gte: today, $lt: tomorrow },
      booking_status: { $in: ["checked_in", "checked_out"] },
    }).sort({ check_out_date: 1 });

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
          is_checked_out: booking.booking_status === "checked_out",
        };
      }),
    );

    res.status(200).json({
      success: true,
      count: bookingsWithDetails.length,
      checked_out_count: bookingsWithDetails.filter((b) => b.is_checked_out)
        .length,
      pending_count: bookingsWithDetails.filter((b) => !b.is_checked_out)
        .length,
      data: bookingsWithDetails,
    });
  } catch (error) {
    console.error("Get today's check-outs error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching today's check-outs",
      error: error.message,
    });
  }
};

module.exports = {
  performCheckIn,
  performCheckOut,
  getCurrentlyCheckedIn,
  markNoShow,
  getBookingHistory,
  getTodayCheckIns,
  getTodayCheckOuts,
};
