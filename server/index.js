require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");

const connectDB = require("./utils/db");
const AuthRouter = require("./routes/Authroutes");
const RoomRouter = require("./routes/Roomroutes");
const BookingRouter = require("./routes/Bookingroutes");
const PaymentRouter = require("./routes/Paymentroutes");
const InventoryRouter = require("./routes/Inventoryroutes");
const StaffRouter = require("./routes/Staffroutes");
const AnalyticsRouter = require("./routes/Analyticsroutes");

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", AuthRouter);
app.use("/api/rooms", RoomRouter);
app.use("/api/bookings", BookingRouter);
app.use("/api/payments", PaymentRouter);
app.use("/api/inventory", InventoryRouter);
app.use("/api/staff", StaffRouter);
app.use("/api/analytics", AnalyticsRouter);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // Mongoose cast error
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
