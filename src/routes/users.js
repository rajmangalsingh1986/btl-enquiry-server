const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { authenticate, requireRole } = require("../middleware/auth");
const asyncHandler = require("../lib/asyncHandler");

const router = express.Router();

router.use(authenticate);
router.use(requireRole("ADMIN"));

const VALID_ROLES = ["SC", "CRE", "SM", "ASM", "ADMIN"];

const userSelect = {
  id: true,
  name: true,
  username: true,
  role: true,
  dealership: { select: { id: true, name: true } },
  createdAt: true,
};

router.get("/", asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: userSelect,
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { name, username, password, role, dealershipId } = req.body || {};

  if (!name || !username || !password || !role) {
    return res.status(400).json({ error: "name, username, password, and role are required" });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` });
  }
  if (role !== "ADMIN" && !dealershipId) {
    return res.status(400).json({ error: "dealershipId is required for this role" });
  }

  let dealershipIdNumber = null;
  if (dealershipId) {
    const dealership = await prisma.dealership.findUnique({ where: { id: Number(dealershipId) } });
    if (!dealership) {
      return res.status(400).json({ error: "Selected dealership not found" });
    }
    dealershipIdNumber = dealership.id;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await prisma.user.create({
    data: {
      name,
      username,
      passwordHash,
      role,
      dealershipId: dealershipIdNumber,
    },
    select: userSelect,
  });

  res.status(201).json(created);
}));

module.exports = router;
