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

async function resolveDealershipId(role, dealershipId) {
  if (role !== "ADMIN" && !dealershipId) {
    return { error: "dealershipId is required for this role" };
  }
  if (!dealershipId) return { dealershipIdNumber: null };

  const dealership = await prisma.dealership.findUnique({ where: { id: Number(dealershipId) } });
  if (!dealership) return { error: "Selected dealership not found" };
  return { dealershipIdNumber: dealership.id };
}

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

  const { error, dealershipIdNumber } = await resolveDealershipId(role, dealershipId);
  if (error) return res.status(400).json({ error });

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

router.patch("/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "User not found" });

  const { name, username, password, role, dealershipId } = req.body || {};
  const nextRole = role || existing.role;
  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` });
  }

  const { error, dealershipIdNumber } = await resolveDealershipId(
    nextRole,
    dealershipId !== undefined ? dealershipId : existing.dealershipId
  );
  if (error) return res.status(400).json({ error });

  const data = {
    name: name || existing.name,
    username: username || existing.username,
    role: nextRole,
    dealershipId: dealershipIdNumber,
  };
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  const updated = await prisma.user.update({ where: { id }, data, select: userSelect });
  res.json(updated);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) {
    return res.status(400).json({ error: "You can't delete your own account." });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "User not found" });

  const linkedEnquiries = await prisma.enquiry.count({
    where: {
      OR: [{ createdById: id }, { creUserId: id }, { smUserId: id }, { asmUserId: id }],
    },
  });
  if (linkedEnquiries > 0) {
    return res.status(400).json({
      error: `This user has ${linkedEnquiries} enquir${linkedEnquiries === 1 ? "y" : "ies"} linked to them and can't be deleted.`,
    });
  }

  await prisma.user.delete({ where: { id } });
  res.status(204).send();
}));

module.exports = router;
