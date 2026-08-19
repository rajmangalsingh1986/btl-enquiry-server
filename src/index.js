require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const dealershipRoutes = require("./routes/dealerships");
const enquiryRoutes = require("./routes/enquiries");
const userRoutes = require("./routes/users");

const app = express();

// Mobile app clients don't send a browser Origin the same way a web app does,
// so CORS restriction isn't meaningful here the way it is for Sales Pipeline
// Management's browser-based client - left open.
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/dealerships", dealershipRoutes);
app.use("/enquiries", enquiryRoutes);
app.use("/users", userRoutes);

app.use((err, req, res, next) => {
  console.error(err);

  if (err.code === "P2003") {
    return res.status(400).json({ error: "That request refers to something that no longer exists. Please refresh and try again." });
  }
  if (err.code === "P2002") {
    return res.status(409).json({ error: "That record already exists." });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Record not found." });
  }

  res.status(500).json({ error: "Internal server error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`BTL enquiry server listening on http://localhost:${port}`);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});
