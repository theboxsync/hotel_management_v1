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
 * @desc    Create new booking (supports multiple rooms)
 * @route   POST /api/bookings
 * @access  Private
 */
const createBooking = async (req, res) => {
  try {
    const {
      room_ids,
      room_breakdown,       // [{ room_id, guests_in_room, extra_bed, extra_bed_cost }]
      customer_name,
      customer_email,
      customer_phone,
      check_in_date,
      check_out_date,
      guests_count,
      booking_source,
      special_requests,
      coupon_code,
      discount_amount,
    } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    const roomIdsArray = Array.isArray(room_ids) ? room_ids : [room_ids];

    if (
      !roomIdsArray.length ||
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    const dateValidation = validateBookingDates(check_in_date, check_out_date);
    if (!dateValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking dates",
        errors: dateValidation.errors,
      });
    }

    const nights = dateValidation.nights;

    // ── Fetch & verify rooms ─────────────────────────────────────────────────
    const rooms = await Room.find({
      _id: { $in: roomIdsArray },
      hotel_id: req.user.hotel_id,
    });

    if (rooms.length !== roomIdsArray.length) {
      return res.status(404).json({ success: false, message: "One or more rooms not found" });
    }

    const unavailableRooms = rooms.filter(
      (r) => r.status === "maintenance" || r.status === "out_of_order"
    );
    if (unavailableRooms.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Room(s) ${unavailableRooms.map((r) => r.room_number).join(", ")} are currently unavailable`,
      });
    }

    // ── Fetch categories ─────────────────────────────────────────────────────
    const categoryIds = [...new Set(rooms.map((r) => r.category_id))];
    const categories = await RoomCategory.find({ _id: { $in: categoryIds } });
    const categoryMap = {};
    categories.forEach((cat) => { categoryMap[cat._id.toString()] = cat; });

    // ── Occupancy check ──────────────────────────────────────────────────────
    const totalMaxOccupancy = rooms.reduce((sum, room) => {
      const cat = categoryMap[room.category_id.toString()];
      return sum + (cat?.max_occupancy || 0);
    }, 0);

    if (guests_count > totalMaxOccupancy) {
      return res.status(400).json({
        success: false,
        message: `Maximum occupancy for selected rooms is ${totalMaxOccupancy} guests.`,
      });
    }

    // ── Availability check ───────────────────────────────────────────────────
    const availabilityChecks = await Promise.all(
      roomIdsArray.map((room_id) => isRoomAvailable(room_id, check_in_date, check_out_date))
    );

    const unavailableRoomIds = roomIdsArray.filter((_, i) => !availabilityChecks[i]);
    if (unavailableRoomIds.length > 0) {
      const nums = rooms
        .filter((r) => unavailableRoomIds.includes(r._id.toString()))
        .map((r) => r.room_number);
      return res.status(409).json({
        success: false,
        message: `Room(s) ${nums.join(", ")} are not available for the selected dates`,
      });
    }

    // ── Build room breakdown & calculate totals ──────────────────────────────
    let subtotal = 0;
    let extraBedTotal = 0;
    const roomBreakdownData = [];

    rooms.forEach((room) => {
      const cat = categoryMap[room.category_id.toString()];
      const roomSubtotal = room.current_price * nights;
      const breakdownItem = (room_breakdown || []).find(
        (b) => b.room_id === room._id.toString()
      );

      // Extra bed — only allowed if category permits it
      const extraBedAllowed = !!cat?.is_extra_bed_allowed;
      const wantsExtraBed = extraBedAllowed && !!breakdownItem?.extra_bed;
      const extraBedCost = wantsExtraBed ? (parseFloat(breakdownItem.extra_bed_cost) || 0) : 0;
      const extraBedRoomTotal = extraBedCost * nights;

      subtotal += roomSubtotal;
      extraBedTotal += extraBedRoomTotal;

      roomBreakdownData.push({
        room_id: room._id.toString(),
        room_number: room.room_number,
        guests_in_room: breakdownItem?.guests_in_room || 0,
        price_per_night: room.current_price,
        nights,
        subtotal: roomSubtotal,

        extra_bed: wantsExtraBed,
        extra_bed_cost: extraBedCost,
        extra_bed_total: extraBedRoomTotal,
      });
    });

    // Total = room subtotal + extra bed charges - discount
    const total_amount = calculateTotalAmount(
      subtotal + extraBedTotal,
      1,                        // nights already baked in
      discount_amount || 0
    );

    // ── Create booking ───────────────────────────────────────────────────────
    const booking_reference = await generateBookingReference(req.user.hotel_id);

    const booking = new Booking({
      hotel_id: req.user.hotel_id,
      room_ids: roomIdsArray,
      total_rooms: roomIdsArray.length,
      customer_name,
      customer_email,
      customer_phone,
      check_in_date: new Date(check_in_date),
      check_out_date: new Date(check_out_date),
      guests_count,
      total_amount,
      booking_status: "confirmed",
      booking_source: booking_source || "direct",
      special_requests: special_requests || "",
      discount_amount: discount_amount || 0,
      coupon_code: coupon_code || null,
      booking_reference,
      room_breakdown: roomBreakdownData,
    });

    const savedBooking = await booking.save();

    // ── Build response ───────────────────────────────────────────────────────
    const roomDetails = rooms.map((room) => {
      const cat = categoryMap[room.category_id.toString()];
      const breakdown = roomBreakdownData.find((b) => b.room_id === room._id.toString());

      return {
        room_number: room.room_number,
        floor: room.floor,
        category_name: cat?.category_name || "Unknown",
        price_per_night: room.current_price,
        guests_in_room: breakdown?.guests_in_room || 0,
        subtotal: breakdown?.subtotal || 0,
        extra_bed: breakdown?.extra_bed || false,
        extra_bed_cost: breakdown?.extra_bed_cost || 0,
        extra_bed_total: breakdown?.extra_bed_total || 0,
      };
    });

    res.status(201).json({
      success: true,
      message: `Booking created successfully for ${roomIdsArray.length} room(s)`,
      data: {
        booking: savedBooking,
        room_details: roomDetails,
        booking_summary: {
          total_rooms: roomIdsArray.length,
          nights,
          subtotal,
          extra_bed_total: extraBedTotal,
          discount: discount_amount || 0,
          total: total_amount,
        },
      },
    });
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
 * @desc    Get all bookings for hotel (Multi-room)
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

    const filter = { hotel_id: req.user.hotel_id };

    if (status) filter.booking_status = status;
    if (source) filter.booking_source = source;
    if (payment_status) filter.payment_status = payment_status;

    // 🔄 room filter (single room search inside multi-room booking)
    if (room_id) {
      filter.room_ids = { $in: [room_id] };
    }

    // Date range
    if (start_date || end_date) {
      filter.check_in_date = {};
      if (start_date) filter.check_in_date.$gte = new Date(start_date);
      if (end_date) filter.check_in_date.$lte = new Date(end_date);
    }

    // Search
    if (search) {
      filter.$or = [
        { customer_name: { $regex: search, $options: "i" } },
        { customer_email: { $regex: search, $options: "i" } },
        { booking_reference: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await Booking.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalBookings = await Booking.countDocuments(filter);

    // 🔍 Attach room details
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
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

        return {
          ...booking.toObject(),
          rooms: roomDetails,
        };
      })
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
 * @desc    Get single booking (Multi-room)
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

    const rooms = await Room.find({ _id: { $in: booking.room_ids } });

    const roomDetails = await Promise.all(
      rooms.map(async (room) => {
        const category = await RoomCategory.findById(room.category_id);
        return {
          room_id: room._id,
          room_number: room.room_number,
          floor: room.floor,
          category_name: category?.category_name,
          current_price: room.current_price,
          amenities: category?.amenities,
        };
      })
    );

    const nights = calculateNights(
      booking.check_in_date,
      booking.check_out_date
    );

    const subtotal = booking.room_breakdown?.length
      ? booking.room_breakdown.reduce((sum, r) => sum + (r.subtotal || 0), 0)
      : booking.total_amount;

    res.status(200).json({
      success: true,
      data: {
        booking,
        rooms: roomDetails,
        booking_summary: {
          nights,
          total_rooms: booking.total_rooms,
          subtotal,
          discount: booking.discount_amount,
          extra_charges: booking.extra_charges,
          grand_total: booking.total_amount + booking.extra_charges,
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
 * @desc    Get booking by reference number (Multi-room)
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
      data: {
        booking,
        rooms: roomDetails,
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
 * @desc    Update booking (Multi-room)
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
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (["checked_out", "cancelled", "no_show"].includes(booking.booking_status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update ${booking.booking_status} booking`,
      });
    }

    const {
      customer_name,
      customer_email,
      customer_phone,
      check_in_date,
      check_out_date,
      booking_status,
      guests_count,
      special_requests,
    } = req.body;

    // 📅 Date update + availability check
    if (check_in_date || check_out_date) {
      const newCheckIn = check_in_date || booking.check_in_date;
      const newCheckOut = check_out_date || booking.check_out_date;

      const dateValidation = validateBookingDates(newCheckIn, newCheckOut, booking_status);
      if (!dateValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking dates",
          errors: dateValidation.errors,
        });
      }

      // Check availability for ALL rooms
      for (const roomId of booking.room_ids) {
        const available = await isRoomAvailable(
          roomId,
          newCheckIn,
          newCheckOut,
          booking._id
        );
        if (!available) {
          return res.status(409).json({
            success: false,
            message: "One or more rooms are not available for new dates",
          });
        }
      }

      booking.check_in_date = new Date(newCheckIn);
      booking.check_out_date = new Date(newCheckOut);

      // 🔢 Recalculate pricing per room
      const nights = dateValidation.nights;
      let total = 0;

      booking.room_breakdown.forEach((room) => {
        room.nights = nights;
        room.subtotal = room.price_per_night * nights;
        total += room.subtotal;
      });

      booking.total_amount = total - booking.discount_amount;
    }

    // ✏️ Simple field updates
    if (customer_name) booking.customer_name = customer_name;

    if (customer_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer_email)) {
        return res.status(400).json({ success: false, message: "Invalid email" });
      }
      booking.customer_email = customer_email;
    }

    if (customer_phone) booking.customer_phone = customer_phone;
    if (special_requests !== undefined) booking.special_requests = special_requests;

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
 * @desc    Cancel booking (Multi-room)
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
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.booking_status === "cancelled") {
      return res.status(400).json({ success: false, message: "Already cancelled" });
    }

    if (booking.booking_status === "checked_out") {
      return res.status(400).json({ success: false, message: "Completed booking" });
    }

    if (booking.booking_status === "checked_in") {
      return res.status(400).json({
        success: false,
        message: "Guest is checked in. Please check-out first.",
      });
    }

    booking.booking_status = "cancelled";

    if (booking.payment_status === "paid") {
      booking.payment_status = "refunded";
    }

    await booking.save();

    // 🏨 Free ALL rooms
    await Room.updateMany(
      { _id: { $in: booking.room_ids } },
      { $set: { status: "available" } }
    );

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });

    console.log(`Cancellation email → ${booking.customer_email}`);
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
 * @desc    Complete booking (Legacy checkout – Multi-room)
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
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.booking_status === "cancelled") {
      return res.status(400).json({ success: false, message: "Cancelled booking" });
    }

    if (booking.booking_status === "checked_out") {
      return res.status(400).json({ success: false, message: "Already completed" });
    }

    booking.booking_status = "checked_out";
    booking.actual_check_out = new Date();
    booking.checked_out_by = req.user._id.toString();
    await booking.save();

    // 🏨 Free ALL rooms
    await Room.updateMany(
      { _id: { $in: booking.room_ids } },
      { $set: { status: "available" } }
    );

    res.status(200).json({
      success: true,
      message: "Booking completed successfully",
      data: booking,
    });

    console.log(`Checkout email → ${booking.customer_email}`);
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
 * @desc    Check room availability (Multi-room)
 * @route   POST /api/bookings/check-availability
 * @access  Private
 */
const checkAvailability = async (req, res) => {
  try {
    const { room_ids, check_in_date, check_out_date } = req.body;

    if (!room_ids || !Array.isArray(room_ids) || !room_ids.length) {
      return res.status(400).json({
        success: false,
        message: "room_ids array is required",
      });
    }

    if (!check_in_date || !check_out_date) {
      return res.status(400).json({
        success: false,
        message: "Check-in and check-out dates are required",
      });
    }

    const dateValidation = validateBookingDates(check_in_date, check_out_date);
    if (!dateValidation.isValid) {
      return res.status(400).json({
        success: false,
        available: false,
        message: "Invalid dates",
        errors: dateValidation.errors,
      });
    }

    const rooms = await Room.find({
      _id: { $in: room_ids },
      hotel_id: req.user.hotel_id,
    });

    if (rooms.length !== room_ids.length) {
      return res.status(404).json({
        success: false,
        message: "One or more rooms not found",
      });
    }

    let available = true;
    let totalAmount = 0;

    for (const room of rooms) {
      const isAvailable = await isRoomAvailable(
        room._id,
        check_in_date,
        check_out_date
      );
      if (!isAvailable) {
        available = false;
        break;
      }
      totalAmount += room.current_price * dateValidation.nights;
    }

    res.status(200).json({
      success: true,
      available,
      data: {
        nights: dateValidation.nights,
        total_rooms: rooms.length,
        estimated_total: totalAmount,
        rooms: rooms.map(room => ({
          room_id: room._id,
          room_number: room.room_number,
          price_per_night: room.current_price,
          status: room.status,
        })),
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
          booking_status: { $in: ["confirmed", "checked_in", "checked_out"] },
          check_in_date: { $lte: endDate },
          check_out_date: { $gte: startDate },
        },
      },
      {
        $project: {
          roomCount: { $size: "$room_ids" },
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
          totalNights: {
            $sum: { $multiply: ["$roomCount", "$nights"] },
          },
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

    const bookings = await Booking.find({
      hotel_id: req.user.hotel_id,
      booking_status: "confirmed",
      check_in_date: { $gte: today, $lte: futureDate },
    }).sort({ check_in_date: 1 });

    const data = await Promise.all(
      bookings.map(async booking => {
        const rooms = await Room.find({ _id: { $in: booking.room_ids } });

        const roomDetails = await Promise.all(
          rooms.map(async room => {
            const category = await RoomCategory.findById(room.category_id);
            return {
              room_number: room.room_number,
              floor: room.floor,
              category_name: category?.category_name,
            };
          })
        );

        return {
          ...booking.toObject(),
          rooms: roomDetails,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Upcoming check-ins error:", error);
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

    const bookings = await Booking.find({
      hotel_id: req.user.hotel_id,
      booking_status: "confirmed",
      check_out_date: { $gte: today, $lte: futureDate },
    }).sort({ check_out_date: 1 });

    const data = await Promise.all(
      bookings.map(async booking => {
        const rooms = await Room.find({ _id: { $in: booking.room_ids } });

        const roomDetails = await Promise.all(
          rooms.map(async room => {
            const category = await RoomCategory.findById(room.category_id);
            return {
              room_number: room.room_number,
              floor: room.floor,
              category_name: category?.category_name,
            };
          })
        );

        return {
          ...booking.toObject(),
          rooms: roomDetails,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Upcoming check-outs error:", error);
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
