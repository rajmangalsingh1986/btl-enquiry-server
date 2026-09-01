const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const asyncHandler = require("../lib/asyncHandler");

const router = express.Router();

router.post("/login", asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      dealership: { select: { id: true, name: true } },
      asmDealerships: { select: { id: true, name: true } },
    },
  });
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const payload = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    dealershipId: user.dealershipId,
    dealershipName: user.dealership?.name || null,
    // ASM only: the set of dealerships their "area" covers.
    dealershipIds: user.asmDealerships.map((d) => d.id),
    dealershipNames: user.asmDealerships.map((d) => d.name),
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });

  res.json({ token, user: payload });
}));

module.exports = router;
