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

router.delete("/:id", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.dealership.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Dealership not found" });

  const [userCount, enquiryCount] = await Promise.all([
    prisma.user.count({ where: { dealershipId: id } }),
    prisma.enquiry.count({ where: { dealershipId: id } }),
  ]);
  if (userCount > 0 || enquiryCount > 0) {
    return res.status(400).json({
      error: `This dealership still has ${userCount} user(s) and ${enquiryCount} enquiry/enquiries linked to it and can't be deleted.`,
    });
  }

  await prisma.dealership.delete({ where: { id } });
  res.status(204).send();
}));

module.exports = router;
