const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HotelAdminSchema = new Schema({
  hotel_id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "manager", "staff"],
    default: "manager",
  },
  permissions: {
    manage_rooms: {
      read: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
    },
    manage_bookings: {
      read: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      cancel: { type: Boolean, default: false },
    },
    manage_staff: {
      read: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
    },
    view_analytics: {
      dashboard: { type: Boolean, default: false },
      reports: { type: Boolean, default: false },
      export: { type: Boolean, default: false },
    },
    manage_settings: {
      hotel_info: { type: Boolean, default: false },
      pricing: { type: Boolean, default: false },
      integrations: { type: Boolean, default: false },
    },
    manage_payments: {
      view: { type: Boolean, default: false },
      refund: { type: Boolean, default: false },
    },
    manage_customers: {
      read: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
    },
  },
  last_login: { type: Date },
  is_verified: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: "hotel_admin" }, // Track who created this user
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Pre-save middleware to hash password
HotelAdminSchema.pre("save", async function () {
  try {
    this.updated_at = Date.now();

    if (!this.isModified("password_hash")) return;

    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
  } catch (error) {
    throw error;
  }
});

// Method to generate auth token
HotelAdminSchema.methods.generateAuthToken = async function (role) {
  try {
    const user = this;
    const token = jwt.sign(
      { _id: user._id.toString(), Role: role },
      process.env.JWT_SECRETKEY,
      { expiresIn: "30d" }
    );
    return token;
  } catch (error) {
    throw error;
  }
};

// Method to get full permissions (for admins, return all true)
HotelAdminSchema.methods.getEffectivePermissions = function () {
  if (this.role === "admin") {
    // Admin has all permissions
    return {
      manage_rooms: { read: true, create: true, update: true, delete: true },
      manage_bookings: {
        read: true,
        create: true,
        update: true,
        delete: true,
        cancel: true,
      },
      manage_staff: { read: true, create: true, update: true, delete: true },
      view_analytics: { dashboard: true, reports: true, export: true },
      manage_settings: { hotel_info: true, pricing: true, integrations: true },
      manage_payments: { view: true, refund: true },
      manage_customers: {
        read: true,
        create: true,
        update: true,
        delete: true,
      },
    };
  }
  return this.permissions;
};

// Method to check specific permission
HotelAdminSchema.methods.hasPermission = function (module, action) {
  if (this.role === "admin") return true;

  if (
    this.permissions &&
    this.permissions[module] &&
    this.permissions[module][action]
  ) {
    return this.permissions[module][action];
  }
  return false;
};

const HotelAdmin = mongoose.model("hotel_admin", HotelAdminSchema);
module.exports = HotelAdmin;