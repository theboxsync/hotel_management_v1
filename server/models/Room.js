const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const areaLayoutSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  images: { type: [String], default: [] },
});

const roomSchema = new Schema({
  hotel_id: { type: String, required: true },
  category_id: { type: String, required: true },
  room_number: { type: String, required: true },
  floor: { type: Number, required: true },
  status: {
    type: String,
    enum: ["available", "occupied", "maintenance", "out_of_order"],
    default: "available",
  },
  current_price: { type: Number, required: true },

  // Room-specific amenities (supplements the category amenities).
  // Stored as string[] — predefined ids or custom free-text labels.
  amenities: { type: [String], default: [] },

  // Named area layouts, each with their own images
  area_layouts: { type: [areaLayoutSchema], default: [] },

  last_updated: { type: Date, default: Date.now },
});

const Room = mongoose.model("room", roomSchema);
module.exports = Room;