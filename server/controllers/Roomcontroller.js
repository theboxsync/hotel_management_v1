const RoomCategory = require("../models/RoomCategory");
const Room = require("../models/Room");
const User = require("../models/User");

/**
 * @desc    Create room category
 * @route   POST /api/rooms/category
 * @access  Private
 */
const createRoomCategory = async (req, res) => {
  try {
    const { category_name, base_price, max_occupancy, amenities, description } =
      req.body;

    // Validation
    if (!category_name || !base_price || !max_occupancy) {
      return res.status(400).json({
        success: false,
        message: "Category name, base price, and max occupancy are required",
      });
    }

    // Validate base price
    if (base_price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Base price must be greater than 0",
      });
    }

    // Validate max occupancy
    if (max_occupancy <= 0) {
      return res.status(400).json({
        success: false,
        message: "Max occupancy must be greater than 0",
      });
    }

    // Check if category already exists for this hotel
    const existingCategory = await RoomCategory.findOne({
      hotel_id: req.user.hotel_id,
      category_name: category_name,
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Room category with this name already exists",
      });
    }

    // Handle uploaded images
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(
        (file) => `/uploads/room-category/${file.filename}`,
      );
    }

    // Create room category
    const roomCategory = new RoomCategory({
      hotel_id: req.user.hotel_id,
      category_name,
      base_price,
      max_occupancy,
      amenities: amenities || [],
      description: description || "",
      images: imageUrls,
    });

    const savedCategory = await roomCategory.save();

    res.status(201).json({
      success: true,
      message: "Room category created successfully",
      data: savedCategory,
    });
  } catch (error) {
    console.error("Create room category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating room category",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all room categories for a hotel
 * @route   GET /api/rooms/category
 * @access  Private
 */
const getRoomCategories = async (req, res) => {
  try {
    const categories = await RoomCategory.find({
      hotel_id: req.user.hotel_id,
    }).sort({ category_name: 1 });

    // Get room count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const roomCount = await Room.countDocuments({
          category_id: category._id.toString(),
        });
        const availableCount = await Room.countDocuments({
          category_id: category._id.toString(),
          status: "available",
        });

        return {
          ...category.toObject(),
          total_rooms: roomCount,
          available_rooms: availableCount,
        };
      }),
    );

    res.status(200).json({
      success: true,
      count: categoriesWithCount.length,
      data: categoriesWithCount,
    });
  } catch (error) {
    console.error("Get room categories error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching room categories",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single room category
 * @route   GET /api/rooms/category/:id
 * @access  Private
 */
const getRoomCategory = async (req, res) => {
  try {
    const category = await RoomCategory.findOne({
      _id: req.params.id,
      hotel_id: req.user.hotel_id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Room category not found",
      });
    }

    // Get rooms in this category
    const rooms = await Room.find({ category_id: category._id.toString() });

    res.status(200).json({
      success: true,
      data: {
        category,
        rooms,
      },
    });
  } catch (error) {
    console.error("Get room category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching room category",
      error: error.message,
    });
  }
};

/**
 * @desc    Update room category
 * @route   PUT /api/rooms/category/:id
 * @access  Private
 */
const updateRoomCategory = async (req, res) => {
  try {
    const {
      category_name,
      base_price,
      max_occupancy,
      amenities,
      description,
      existing_images, // Images already saved (sent from frontend)
    } = req.body;

    // Find category
    const category = await RoomCategory.findOne({
      _id: req.params.id,
      hotel_id: req.user.hotel_id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Room category not found",
      });
    }

    // Check if new category name conflicts
    if (category_name && category_name !== category.category_name) {
      const existingCategory = await RoomCategory.findOne({
        hotel_id: req.user.hotel_id,
        category_name: category_name,
        _id: { $ne: req.params.id },
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Room category with this name already exists",
        });
      }
    }

    // Handle uploaded images
    let newImageUrls = [];
    if (req.files && req.files.length > 0) {
      newImageUrls = req.files.map(
        (file) => `/uploads/room-category/${file.filename}`,
      );
    }

    // Combine existing images with new uploads
    let allImages = [];
    if (existing_images) {
      // If existing_images is sent as JSON string, parse it
      try {
        allImages =
          typeof existing_images === "string"
            ? JSON.parse(existing_images)
            : existing_images;
      } catch (e) {
        allImages = [];
      }
    }
    allImages = [...allImages, ...newImageUrls];

    // Update fields
    if (category_name) category.category_name = category_name;
    if (base_price) {
      if (base_price <= 0) {
        return res.status(400).json({
          success: false,
          message: "Base price must be greater than 0",
        });
      }
      category.base_price = base_price;
    }
    if (max_occupancy) {
      if (max_occupancy <= 0) {
        return res.status(400).json({
          success: false,
          message: "Max occupancy must be greater than 0",
        });
      }
      category.max_occupancy = max_occupancy;
    }
    if (amenities !== undefined) category.amenities = amenities;
    if (description !== undefined) category.description = description;
    category.images = allImages; // Update with combined images

    const updatedCategory = await category.save();

    // Update all rooms in this category with new base price
    if (base_price) {
      await Room.updateMany(
        { category_id: category._id.toString() },
        { current_price: base_price, last_updated: new Date() },
      );
    }

    res.status(200).json({
      success: true,
      message: "Room category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    console.error("Update room category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating room category",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete room category
 * @route   DELETE /api/rooms/category/:id
 * @access  Private
 */
const deleteRoomCategory = async (req, res) => {
  try {
    const category = await RoomCategory.findOne({
      _id: req.params.id,
      hotel_id: req.user.hotel_id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Room category not found",
      });
    }

    // Check if there are rooms in this category
    const roomCount = await Room.countDocuments({
      category_id: category._id.toString(),
    });

    if (roomCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${roomCount} room(s) are assigned to this category. Please reassign or delete the rooms first.`,
      });
    }

    await RoomCategory.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Room category deleted successfully",
    });
  } catch (error) {
    console.error("Delete room category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting room category",
      error: error.message,
    });
  }
};

/**
 * @desc    Create room
 * @route   POST /api/rooms
 * @access  Private
 */
const createRoom = async (req, res) => {
  try {
    const { category_id, room_number, floor, status, current_price } = req.body;

    // Validation
    if (!category_id || !room_number || floor === undefined) {
      return res.status(400).json({
        success: false,
        message: "Category ID, room number, and floor are required",
      });
    }

    // Verify category exists and belongs to this hotel
    const category = await RoomCategory.findOne({
      _id: category_id,
      hotel_id: req.user.hotel_id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Room category not found",
      });
    }

    // Check if room number already exists for this hotel
    const existingRoom = await Room.findOne({
      hotel_id: req.user.hotel_id,
      room_number: room_number,
    });

    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: "Room number already exists",
      });
    }

    // Create room
    const room = new Room({
      hotel_id: req.user.hotel_id,
      category_id,
      room_number,
      floor,
      status: status || "available",
      current_price: current_price || category.base_price,
    });

    const savedRoom = await room.save();

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      data: savedRoom,
    });
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating room",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all rooms for a hotel
 * @route   GET /api/rooms
 * @access  Private
 */
const getRooms = async (req, res) => {
  try {
    const { category_id, status, floor } = req.query;

    // Build filter
    const filter = { hotel_id: req.user.hotel_id };
    if (category_id) filter.category_id = category_id;
    if (status) filter.status = status;
    if (floor) filter.floor = parseInt(floor);

    const rooms = await Room.find(filter).sort({ room_number: 1 });

    // Populate with category details
    const roomsWithCategory = await Promise.all(
      rooms.map(async (room) => {
        const category = await RoomCategory.findById(room.category_id);
        return {
          ...room.toObject(),
          category_details: category,
        };
      }),
    );

    res.status(200).json({
      success: true,
      count: roomsWithCategory.length,
      data: roomsWithCategory,
    });
  } catch (error) {
    console.error("Get rooms error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching rooms",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single room
 * @route   GET /api/rooms/:id
 * @access  Private
 */
const getRoom = async (req, res) => {
  try {
    const room = await Room.findOne({
      _id: req.params.id,
      hotel_id: req.user.hotel_id,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    const category = await RoomCategory.findById(room.category_id);

    res.status(200).json({
      success: true,
      data: {
        ...room.toObject(),
        category_details: category,
      },
    });
  } catch (error) {
    console.error("Get room error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching room",
      error: error.message,
    });
  }
};

/**
 * @desc    Update room
 * @route   PUT /api/rooms/:id
 * @access  Private
 */
const updateRoom = async (req, res) => {
  try {
    const { category_id, room_number, floor, status, current_price } = req.body;

    const room = await Room.findOne({
      _id: req.params.id,
      hotel_id: req.user.hotel_id,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Check if new room number conflicts
    if (room_number && room_number !== room.room_number) {
      const existingRoom = await Room.findOne({
        hotel_id: req.user.hotel_id,
        room_number: room_number,
        _id: { $ne: req.params.id },
      });

      if (existingRoom) {
        return res.status(400).json({
          success: false,
          message: "Room number already exists",
        });
      }
    }

    // Verify new category if provided
    if (category_id && category_id !== room.category_id) {
      const category = await RoomCategory.findOne({
        _id: category_id,
        hotel_id: req.user.hotel_id,
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Room category not found",
        });
      }
    }

    // Update fields
    if (category_id) room.category_id = category_id;
    if (room_number) room.room_number = room_number;
    if (floor !== undefined) room.floor = floor;
    if (status) room.status = status;
    if (current_price !== undefined) room.current_price = current_price;
    room.last_updated = new Date();

    const updatedRoom = await room.save();

    res.status(200).json({
      success: true,
      message: "Room updated successfully",
      data: updatedRoom,
    });
  } catch (error) {
    console.error("Update room error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating room",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete room
 * @route   DELETE /api/rooms/:id
 * @access  Private
 */
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findOne({
      _id: req.params.id,
      hotel_id: req.user.hotel_id,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Check if room is occupied
    if (room.status === "occupied") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete occupied room. Please check out the guest first.",
      });
    }

    await Room.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    console.error("Delete room error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting room",
      error: error.message,
    });
  }
};

/**
 * @desc    Update room status
 * @route   PATCH /api/rooms/:id/status
 * @access  Private
 */
const updateRoomStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const validStatuses = [
      "available",
      "occupied",
      "maintenance",
      "out_of_order",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const room = await Room.findOne({
      _id: req.params.id,
      hotel_id: req.user.hotel_id,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    room.status = status;
    room.last_updated = new Date();
    await room.save();

    res.status(200).json({
      success: true,
      message: "Room status updated successfully",
      data: room,
    });
  } catch (error) {
    console.error("Update room status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating room status",
      error: error.message,
    });
  }
};

/**
 * @desc    Bulk create rooms
 * @route   POST /api/rooms/bulk
 * @access  Private
 */
const bulkCreateRooms = async (req, res) => {
  try {
    const { category_id, start_room_number, end_room_number, floor } = req.body;

    // Validation
    if (
      !category_id ||
      !start_room_number ||
      !end_room_number ||
      floor === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Category ID, start room number, end room number, and floor are required",
      });
    }

    // Verify category
    const category = await RoomCategory.findOne({
      _id: category_id,
      hotel_id: req.user.hotel_id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Room category not found",
      });
    }

    const startNum = parseInt(start_room_number);
    const endNum = parseInt(end_room_number);

    if (startNum > endNum) {
      return res.status(400).json({
        success: false,
        message: "Start room number must be less than or equal to end number",
      });
    }

    if (endNum - startNum > 100) {
      return res.status(400).json({
        success: false,
        message: "Cannot create more than 100 rooms at once",
      });
    }

    // Create rooms
    const rooms = [];
    const errors = [];

    for (let i = startNum; i <= endNum; i++) {
      const roomNumber = i.toString();

      // Check if room exists
      const existingRoom = await Room.findOne({
        hotel_id: req.user.hotel_id,
        room_number: roomNumber,
      });

      if (existingRoom) {
        errors.push(`Room ${roomNumber} already exists`);
        continue;
      }

      const room = new Room({
        hotel_id: req.user.hotel_id,
        category_id,
        room_number: roomNumber,
        floor,
        status: "available",
        current_price: category.base_price,
      });

      rooms.push(room);
    }

    // Save all rooms
    const savedRooms = await Room.insertMany(rooms);

    res.status(201).json({
      success: true,
      message: `${savedRooms.length} rooms created successfully`,
      data: {
        created_count: savedRooms.length,
        rooms: savedRooms,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Bulk create rooms error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating rooms",
      error: error.message,
    });
  }
};

module.exports = {
  // Room Category
  createRoomCategory,
  getRoomCategories,
  getRoomCategory,
  updateRoomCategory,
  deleteRoomCategory,

  // Room
  createRoom,
  getRooms,
  getRoom,
  updateRoom,
  deleteRoom,
  updateRoomStatus,
  bulkCreateRooms,
};
