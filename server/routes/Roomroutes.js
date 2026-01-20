const express = require("express");
const RoomRouter = express.Router();
const {
  createRoomCategory,
  getRoomCategories,
  getRoomCategory,
  updateRoomCategory,
  deleteRoomCategory,
  createRoom,
  getRooms,
  getRoom,
  updateRoom,
  deleteRoom,
  updateRoomStatus,
  bulkCreateRooms,
} = require("../controllers/Roomcontroller");
const {
  authenticate,
  checkSubscription,
  checkPermission,
} = require("../middlewares/Authmiddleware");

// Apply authentication and subscription check to all room routes
RoomRouter.use(authenticate);
RoomRouter.use(checkSubscription);

// ============================================
// ROOM CATEGORY ROUTES
// ============================================

/**
 * @route   POST /api/rooms/category
 * @desc    Create room category
 * @access  Private (requires manage_rooms permission)
 */
RoomRouter.post("/category", checkPermission("manage_rooms"), createRoomCategory);

/**
 * @route   GET /api/rooms/category
 * @desc    Get all room categories for hotel
 * @access  Private
 */
RoomRouter.get("/category", getRoomCategories);

/**
 * @route   GET /api/rooms/category/:id
 * @desc    Get single room category
 * @access  Private
 */
RoomRouter.get("/category/:id", getRoomCategory);

/**
 * @route   PUT /api/rooms/category/:id
 * @desc    Update room category
 * @access  Private (requires manage_rooms permission)
 */
RoomRouter.put(
  "/category/:id",
  checkPermission("manage_rooms"),
  updateRoomCategory
);

/**
 * @route   DELETE /api/rooms/category/:id
 * @desc    Delete room category
 * @access  Private (requires manage_rooms permission)
 */
RoomRouter.delete(
  "/category/:id",
  checkPermission("manage_rooms"),
  deleteRoomCategory
);

// ============================================
// ROOM ROUTES
// ============================================

/**
 * @route   POST /api/rooms/bulk
 * @desc    Bulk create rooms
 * @access  Private (requires manage_rooms permission)
 */
RoomRouter.post("/bulk", checkPermission("manage_rooms"), bulkCreateRooms);

/**
 * @route   POST /api/rooms
 * @desc    Create single room
 * @access  Private (requires manage_rooms permission)
 */
RoomRouter.post("/", checkPermission("manage_rooms"), createRoom);

/**
 * @route   GET /api/rooms
 * @desc    Get all rooms for hotel (with filters)
 * @access  Private
 */
RoomRouter.get("/", getRooms);

/**
 * @route   GET /api/rooms/:id
 * @desc    Get single room
 * @access  Private
 */
RoomRouter.get("/:id", getRoom);

/**
 * @route   PUT /api/rooms/:id
 * @desc    Update room
 * @access  Private (requires manage_rooms permission)
 */
RoomRouter.put("/:id", checkPermission("manage_rooms"), updateRoom);

/**
 * @route   DELETE /api/rooms/:id
 * @desc    Delete room
 * @access  Private (requires manage_rooms permission)
 */
RoomRouter.delete("/:id", checkPermission("manage_rooms"), deleteRoom);

/**
 * @route   PATCH /api/rooms/:id/status
 * @desc    Update room status
 * @access  Private (requires manage_rooms permission)
 */
RoomRouter.patch("/:id/status", checkPermission("manage_rooms"), updateRoomStatus);

module.exports = RoomRouter;
