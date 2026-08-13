const express = require("express");
const prisma = require("../lib/prisma");
const { authenticate } = require("../middleware/auth");
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

module.exports = router;
