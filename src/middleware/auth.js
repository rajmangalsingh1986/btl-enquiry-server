const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

// Tokens last 30 days (field consultants shouldn't have to re-login mid-activity),
// so re-checking here (not just at login) is what makes a role/dealership change
// take effect immediately instead of after the existing token expires.
async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true } });
    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
