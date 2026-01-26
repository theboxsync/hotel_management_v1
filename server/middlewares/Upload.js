const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create upload directories if they don't exist
const createUploadDirs = () => {
  const dirs = [
    "uploads",
    "uploads/room-category",
    "uploads/rooms",
    "uploads/profile",
    "uploads/temp",
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Storage configuration for room category images
const roomCategoryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/room-category");
  },
  filename: (req, file, cb) => {
    // Generate unique filename: hotel_id-timestamp-randomstring.ext
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const hotel_id = req.user?.hotel_id || "unknown";
    cb(null, `${hotel_id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Storage configuration for room images
const roomStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/rooms");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const hotel_id = req.user?.hotel_id || "unknown";
    cb(null, `${hotel_id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Storage configuration for profile images
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/profile");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const user_id = req.user?._id || "unknown";
    cb(null, `${user_id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// File filter - only accept images
const imageFileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.",
      ),
      false,
    );
  }
};

// Upload configurations
const uploadRoomCategoryImage = multer({
  storage: roomCategoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: imageFileFilter,
});

const uploadRoomImage = multer({
  storage: roomStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFileFilter,
});

const uploadProfileImage = multer({
  storage: profileStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: imageFileFilter,
});

// Helper function to delete file
const deleteFile = (filepath) => {
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    return true;
  }
  return false;
};

// Helper function to delete multiple files
const deleteFiles = (filepaths) => {
  filepaths.forEach((filepath) => {
    deleteFile(filepath);
  });
};

// Get file URL
const getFileUrl = (filepath) => {
  if (!filepath) return null;
  // Remove 'uploads/' prefix if exists
  const cleanPath = filepath.replace(/^uploads\//, "");
  return `/uploads/${cleanPath}`;
};

module.exports = {
  uploadRoomCategoryImage,
  uploadRoomImage,
  uploadProfileImage,
  deleteFile,
  deleteFiles,
  getFileUrl,
  createUploadDirs,
};
