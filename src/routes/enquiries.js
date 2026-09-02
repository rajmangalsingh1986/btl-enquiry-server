const express = require("express");
const prisma = require("../lib/prisma");
const { authenticate, requireRole } = require("../middleware/auth");
const asyncHandler = require("../lib/asyncHandler");

const router = express.Router();
router.use(authenticate);

const REQUIRED_FIELDS = [
  "activityName", "location", "activityDate",
  "customerName", "contactNo", "profile", "segment",
  "vehicleModelInterested",
];

const enquiryInclude = {
  dealership: { select: { id: true, name: true } },
  creUser: { select: { id: true, name: true } },
  smUser: { select: { id: true, name: true } },
  asmUser: { select: { id: true, name: true } },
};

// Segment-based routing for CRE/SM. A null userSegment means "not
// specialized" - sees every segment. BEV always travels with Personal.
function segmentWhereClause(userSegment) {
  if (!userSegment) return {};
  if (userSegment === "Personal") return { segment: { in: ["Personal", "BEV"] } };
  return { segment: userSegment };
}

function matchesUserSegment(enquirySegment, userSegment) {
  if (!userSegment) return true;
  if (userSegment === "Personal") return enquirySegment === "Personal" || enquirySegment === "BEV";
  return enquirySegment === userSegment;
}

// Guards the CRE/SM tagging endpoints: even with the right role and stage,
// an enquiry outside this user's own dealership/segment isn't theirs to act
// on - closes the same gap the list endpoint's filtering already prevents
// from being visible in the first place.
function assertRoutedToUser(req, row) {
  if (row.dealershipId !== req.user.dealershipId) return "This enquiry is not at your dealership.";
  if (!matchesUserSegment(row.segment, req.user.segment)) return "This enquiry is not in your assigned segment.";
  return null;
}

function serialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    clientUuid: row.clientUuid,
    activityName: row.activityName,
    location: row.location,
    activityDate: row.activityDate.toISOString().slice(0, 10),
    dealershipName: row.dealership?.name,
    customerName: row.customerName,
    contactNo: row.contactNo,
    profile: row.profile,
    segment: row.segment,
    application: row.application,
    currentVehicle: row.currentVehicle,
    vehicleModelInterested: row.vehicleModelInterested,
    variant: row.variant,
    exchangeInterested: row.exchangeInterested,
    stage: row.stage,
    cre: {
      validation: row.creValidation,
      tag: row.creTag,
      remarks: row.creRemarks,
      userId: row.creUserId,
      taggedAt: row.creTaggedAt,
    },
    sm: {
      status: row.smStatus,
      remarks: row.smRemarks,
      userId: row.smUserId,
      taggedAt: row.smTaggedAt,
    },
    asm: {
      status: row.asmStatus,
      remarks: row.asmRemarks,
      userId: row.asmUserId,
      taggedAt: row.asmTaggedAt,
    },
    createdBy: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Create enquiry (Sales Consultant)
router.post("/", requireRole("SC"), asyncHandler(async (req, res) => {
  const body = req.body || {};
  const missing = REQUIRED_FIELDS.filter((f) => !body[f]);
  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
  }
  if (body.segment === "Commercial" && !body.application) {
    return res.status(400).json({ error: "Missing fields: application" });
  }

  // Idempotent create: if this client_uuid was already synced, return the existing row.
  if (body.clientUuid) {
    const existing = await prisma.enquiry.findUnique({
      where: { clientUuid: body.clientUuid },
      include: enquiryInclude,
    });
    if (existing) return res.status(200).json(serialize(existing));
  }

  // The enquiry's dealership is always the creating SC's own dealership, taken
  // from their authenticated account - never from the request body. This is
  // what guarantees an SC's enquiries can only ever reach the CRE/SM/ASM at
  // their own dealership, regardless of what a client sends.
  if (!req.user.dealershipId) {
    return res.status(400).json({ error: "Your account is not assigned to a dealership. Contact your admin." });
  }

  const created = await prisma.enquiry.create({
    data: {
      clientUuid: body.clientUuid || null,
      activityName: body.activityName,
      location: body.location,
      activityDate: new Date(body.activityDate),
      dealershipId: req.user.dealershipId,
      customerName: body.customerName,
      contactNo: body.contactNo,
      profile: body.profile,
      segment: body.segment,
      application: body.application || null,
      currentVehicle: body.currentVehicle || null,
      vehicleModelInterested: body.vehicleModelInterested,
      variant: body.variant || null,
      exchangeInterested: !!body.exchangeInterested,
      createdById: req.user.id,
    },
    include: enquiryInclude,
  });

  res.status(201).json(serialize(created));
}));

// List enquiries - behavior depends on role
router.get("/", asyncHandler(async (req, res) => {
  const { role, id, dealershipId, dealershipIds, segment } = req.user;
  const { mine } = req.query;

  let where;
  if (role === "SC" || mine === "true") {
    where = { createdById: id };
  } else if (role === "CRE") {
    where = { dealershipId, stage: "CREATED", ...segmentWhereClause(segment) };
  } else if (role === "SM") {
    // SM now owns both the status tag and the final/closing tag.
    where = { dealershipId, stage: { in: ["CRE_TAGGED", "SM_TAGGED"] }, ...segmentWhereClause(segment) };
  } else if (role === "ASM") {
    // View/download only, across every dealership in their assigned area -
    // no stage filter, since they aren't acting on any of these.
    where = { dealershipId: { in: dealershipIds || [] } };
  } else if (role === "ADMIN") {
    where = {};
  } else {
    return res.json([]);
  }

  const rows = await prisma.enquiry.findMany({
    where,
    include: enquiryInclude,
    orderBy: { createdAt: role === "SC" || role === "ADMIN" || role === "ASM" || mine === "true" ? "desc" : "asc" },
  });
  res.json(rows.map(serialize));
}));

// History of enquiries this user has already actioned on
router.get("/history", asyncHandler(async (req, res) => {
  const { role, id } = req.user;
  const column = { CRE: "creUserId", SM: "smUserId", ASM: "asmUserId" }[role];
  if (!column) return res.json([]);

  const rows = await prisma.enquiry.findMany({
    where: { [column]: id },
    include: enquiryInclude,
    orderBy: { updatedAt: "desc" },
  });
  res.json(rows.map(serialize));
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const row = await prisma.enquiry.findUnique({
    where: { id: Number(req.params.id) },
    include: enquiryInclude,
  });
  if (!row) return res.status(404).json({ error: "Enquiry not found" });
  res.json(serialize(row));
}));

// CRE validates and tags
router.patch("/:id/cre", requireRole("CRE"), asyncHandler(async (req, res) => {
  const { validation, tag, remarks } = req.body || {};
  if (!validation || !tag) return res.status(400).json({ error: "validation and tag are required" });

  const id = Number(req.params.id);
  const row = await prisma.enquiry.findUnique({ where: { id } });
  if (!row) return res.status(404).json({ error: "Enquiry not found" });
  const routingError = assertRoutedToUser(req, row);
  if (routingError) return res.status(403).json({ error: routingError });
  if (row.stage !== "CREATED") return res.status(409).json({ error: `Enquiry is already at stage ${row.stage}` });

  const updated = await prisma.enquiry.update({
    where: { id },
    data: {
      creValidation: validation,
      creTag: tag,
      creRemarks: remarks || null,
      creUserId: req.user.id,
      creTaggedAt: new Date(),
      stage: "CRE_TAGGED",
    },
    include: enquiryInclude,
  });

  res.json(serialize(updated));
}));

// Sales Manager current status tagging
router.patch("/:id/sm", requireRole("SM"), asyncHandler(async (req, res) => {
  const { status, remarks } = req.body || {};
  if (!status) return res.status(400).json({ error: "status is required" });

  const id = Number(req.params.id);
  const row = await prisma.enquiry.findUnique({ where: { id } });
  if (!row) return res.status(404).json({ error: "Enquiry not found" });
  const routingError = assertRoutedToUser(req, row);
  if (routingError) return res.status(403).json({ error: routingError });
  if (row.stage !== "CRE_TAGGED") return res.status(409).json({ error: `Enquiry is already at stage ${row.stage}` });

  const updated = await prisma.enquiry.update({
    where: { id },
    data: {
      smStatus: status,
      smRemarks: remarks || null,
      smUserId: req.user.id,
      smTaggedAt: new Date(),
      stage: "SM_TAGGED",
    },
    include: enquiryInclude,
  });

  res.json(serialize(updated));
}));

// Final/closing tag - performed by SM (ASM is view/download-only). Endpoint
// path and field names keep the "asm" name for continuity.
router.patch("/:id/asm", requireRole("SM"), asyncHandler(async (req, res) => {
  const { status, remarks } = req.body || {};
  if (!status) return res.status(400).json({ error: "status is required" });

  const id = Number(req.params.id);
  const row = await prisma.enquiry.findUnique({ where: { id } });
  if (!row) return res.status(404).json({ error: "Enquiry not found" });
  const routingError = assertRoutedToUser(req, row);
  if (routingError) return res.status(403).json({ error: routingError });
  if (row.stage !== "SM_TAGGED") return res.status(409).json({ error: `Enquiry is already at stage ${row.stage}` });

  const updated = await prisma.enquiry.update({
    where: { id },
    data: {
      asmStatus: status,
      asmRemarks: remarks || null,
      asmUserId: req.user.id,
      asmTaggedAt: new Date(),
      stage: "ASM_TAGGED",
    },
    include: enquiryInclude,
  });

  res.json(serialize(updated));
}));

module.exports = router;
