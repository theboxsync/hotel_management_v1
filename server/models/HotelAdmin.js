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
    enum: ["admin", "manager"],
    default: "admin",
  },
  permissions: { type: Schema.Types.Mixed },
  last_login: { type: Date },
  is_verified: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

// Pre-save middleware to hash password
HotelAdminSchema.pre("save", async function () {
  // Only hash if password changed
  if (!this.isModified("password_hash")) return;

  const salt = await bcrypt.genSalt(10);
  this.password_hash = await bcrypt.hash(this.password_hash, salt);
});

// Method to generate auth token
HotelAdminSchema.methods.generateAuthToken = async function (role) {
  try {
    const user = this;
    const token = jwt.sign(
      { _id: user._id.toString(), Role: role },
      process.env.JWT_SECRETKEY,
      { expiresIn: "30d" },
    );
    return token;
  } catch (error) {
    throw error;
  }
};

const HotelAdmin = mongoose.model("hotel_admin", HotelAdminSchema);
module.exports = HotelAdmin;
