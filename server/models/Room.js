const mongoose = require("mongoose");
const Schema = mongoose.Schema;

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
  last_updated: { type: Date, default: Date.now },
});

const Room = mongoose.model("room", roomSchema);
module.exports = Room;
