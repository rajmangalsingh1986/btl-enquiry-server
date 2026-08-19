const express = require("express");
const prisma = require("../lib/prisma");
const { authenticate, requireRole } = require("../middleware/auth");
const asyncHandler = require("../lib/asyncHandler");

const router = express.Router();

router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const dealerships = await prisma.dealership.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  res.json(dealerships);
}));

router.post("/", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const { name, location, state } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const created = await prisma.dealership.create({
    data: {
      name: name.trim(),
      location: location?.trim() || null,
      state: state?.trim() || null,
    },
  });

  res.status(201).json(created);
}));

module.exports = router;
