const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const roomCategorySchema = new Schema({
  hotel_id: { type: String, required: true },
  category_name: { type: String, required: true },
  base_price: { type: Number, required: true },
  max_occupancy: { type: Number, required: true },
  amenities: { type: Schema.Types.Mixed },
  description: { type: String },
  images: { type: [String] },
});

const RoomCategory = mongoose.model("room_category", roomCategorySchema);
module.exports = RoomCategory;