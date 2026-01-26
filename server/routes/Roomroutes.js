const express = require("express");
const router = express.Router();
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
const {
  uploadRoomCategoryImage,
  uploadRoomImage,
} = require("../middlewares/Upload");

// Apply authentication and subscription check to all room routes
router.use(authenticate);
router.use(checkSubscription);

// ============================================
// ROOM CATEGORY ROUTES
// ============================================

/**
 * @route   POST /api/rooms/category
 * @desc    Create room category with images
 * @access  Private (requires manage_rooms permission)
 */
router.post(
  "/category",
  checkPermission("manage_rooms"),
  uploadRoomCategoryImage.array("images", 5), // Upload up to 5 images
  createRoomCategory,
);

/**
 * @route   GET /api/rooms/category
 * @desc    Get all room categories for hotel
 * @access  Private
 */
router.get("/category", getRoomCategories);

/**
 * @route   GET /api/rooms/category/:id
 * @desc    Get single room category
 * @access  Private
 */
router.get("/category/:id", getRoomCategory);

/**
 * @route   PUT /api/rooms/category/:id
 * @desc    Update room category with images
 * @access  Private (requires manage_rooms permission)
 */
router.put(
  "/category/:id",
  checkPermission("manage_rooms"),
  uploadRoomCategoryImage.array("images", 5), // Upload up to 5 images
  updateRoomCategory,
);

/**
 * @route   DELETE /api/rooms/category/:id
 * @desc    Delete room category
 * @access  Private (requires manage_rooms permission)
 */
router.delete(
  "/category/:id",
  checkPermission("manage_rooms"),
  deleteRoomCategory,
);

// ============================================
// ROOM ROUTES
// ============================================

/**
 * @route   POST /api/rooms/bulk
 * @desc    Bulk create rooms
 * @access  Private (requires manage_rooms permission)
 */
router.post("/bulk", checkPermission("manage_rooms"), bulkCreateRooms);

/**
 * @route   POST /api/rooms
 * @desc    Create single room with images
 * @access  Private (requires manage_rooms permission)
 */
router.post(
  "/",
  checkPermission("manage_rooms"),
  uploadRoomImage.array("images", 10), // Upload up to 10 images
  createRoom,
);

/**
 * @route   GET /api/rooms
 * @desc    Get all rooms for hotel (with filters)
 * @access  Private
 */
router.get("/", getRooms);

/**
 * @route   GET /api/rooms/:id
 * @desc    Get single room
 * @access  Private
 */
router.get("/:id", getRoom);

/**
 * @route   PUT /api/rooms/:id
 * @desc    Update room with images
 * @access  Private (requires manage_rooms permission)
 */
router.put(
  "/:id",
  checkPermission("manage_rooms"),
  uploadRoomImage.array("images", 10), // Upload up to 10 images
  updateRoom,
);

/**
 * @route   DELETE /api/rooms/:id
 * @desc    Delete room
 * @access  Private (requires manage_rooms permission)
 */
router.delete("/:id", checkPermission("manage_rooms"), deleteRoom);

/**
 * @route   PATCH /api/rooms/:id/status
 * @desc    Update room status
 * @access  Private (requires manage_rooms permission)
 */
router.patch("/:id/status", checkPermission("manage_rooms"), updateRoomStatus);

module.exports = router;
