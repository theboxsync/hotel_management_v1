const express = require("express");
const {
  getStaffPositions,
  getStaffData,
  getStaffDataById,
  addStaff,
  updateStaff,
  deleteStaff,
  checkIn,
  checkOut,
  markAbsent,
  getAllFaceEncodings,
} = require("../controllers/Staffcontroller");
const {
  authenticate,
  checkSubscription,
  checkPermission,
} = require("../middlewares/Authmiddleware");
const {  uploadStaffImage } = require("../middlewares/Upload");

const StaffRouter = express.Router();

StaffRouter.use(authenticate);
StaffRouter.use(checkSubscription);

StaffRouter.route("/get-all").get(getStaffData);
StaffRouter.route("/get/:id").get(getStaffDataById);
StaffRouter.route("/get-positions").get(getStaffPositions);
StaffRouter.route("/add").post(
  checkPermission("manage_staff"),
   uploadStaffImage.fields([
    { name: "photo", maxCount: 1 },
    { name: "front_image", maxCount: 1 },
    { name: "back_image", maxCount: 1 }
  ]),
  addStaff
);

StaffRouter
  .route("/edit/:id")
  .put(
    checkPermission("manage_staff"),
     uploadStaffImage.fields([
      { name: "photo", maxCount: 1 },
      { name: "front_image", maxCount: 1 },
      { name: "back_image", maxCount: 1 }
    ]),
    updateStaff);

StaffRouter
  .route("/delete/:id")
  .delete(checkPermission("manage_staff"), deleteStaff);

StaffRouter.post("/check-in", checkIn);
StaffRouter.post("/check-out", checkOut);
StaffRouter.post("/mark-absent", markAbsent);
StaffRouter.get("/face-data", getAllFaceEncodings);

module.exports = StaffRouter;
