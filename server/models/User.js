const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  hotel_name: { type: String, required: true },
  owner_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  registration_date: { type: Date, default: Date.now },
  verification_status: { type: Boolean, default: false },
  subscription_id: { type: String },
  subscription_expiry: { type: Date },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
});

const User = mongoose.model("user", userSchema);
module.exports = User;
