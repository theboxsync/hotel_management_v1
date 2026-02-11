const express = require("express");
const {
  getInventoryData,
  getInventoryDataByStatus,
  getInventoryDataById,
  getInventorySuggestions,
  addInventory,
  addInventoryRequest,
  updateInventory,
  deleteInventory,
  completeInventoryRequest,
  rejectInventoryRequest,
} = require("../controllers/Inventorycontroller");
const {
  authenticate,
  checkSubscription,
  checkPermission,
} = require("../middlewares/Authmiddleware");
const {  uploadInventoryImage } = require("../middlewares/Upload");

const InventoryRouter = express.Router();

InventoryRouter.use(authenticate);
InventoryRouter.use(checkSubscription);

InventoryRouter
  .route("/get-all")
  .get(getInventoryData);
InventoryRouter
  .route("/get-by-status/:status")
  .get(getInventoryDataByStatus);
InventoryRouter
  .route("/get/:id")
  .get(getInventoryDataById);
InventoryRouter
  .route("/get-suggestions")
  .get(getInventorySuggestions);
InventoryRouter.route("/add").post( uploadInventoryImage.array("bill_files"), addInventory);
InventoryRouter
  .route("/add-request")
  .post(addInventoryRequest);
InventoryRouter
  .route("/delete/:id")
  .delete(deleteInventory);
InventoryRouter
  .route("/update/:id")
  .put( uploadInventoryImage.array("bill_files"), updateInventory);
InventoryRouter
  .route("/complete-request")
  .post(checkPermission("manage_inventory"),  uploadInventoryImage.array("bill_files"), completeInventoryRequest);
InventoryRouter
  .route("/reject-request/:id")
  .post(checkPermission("manage_inventory"), rejectInventoryRequest);

module.exports = InventoryRouter;
