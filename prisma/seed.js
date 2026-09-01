require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEALERSHIP_NAME = "Prime Motors - Andheri";

// These are bootstrap accounts only - the seed creates them if missing, but
// never touches an existing row. Once created, all further management
// (dealership reassignment, role changes, deletion, etc.) happens through
// the Admin UI and must survive redeploys untouched.
const dealershipUsers = [
  { name: "Aarav Sharma", username: "sc1", password: "sc123", role: "SC" },
  { name: "Priya Nair", username: "cre1", password: "cre123", role: "CRE" },
  { name: "Rohan Mehta", username: "sm1", password: "sm123", role: "SM" },
];

const asm = { name: "Kavita Rao", username: "asm1", password: "asm123", role: "ASM" };
const admin = { name: "Admin", username: "admin1", password: "admin123", role: "ADMIN" };

async function main() {
  const dealership = await prisma.dealership.upsert({
    where: { name: DEALERSHIP_NAME },
    update: {},
    create: { name: DEALERSHIP_NAME },
  });

  for (const u of dealershipUsers) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        name: u.name,
        username: u.username,
        passwordHash,
        role: u.role,
        dealershipId: dealership.id,
      },
    });
  }

  const asmPasswordHash = await bcrypt.hash(asm.password, 10);
  await prisma.user.upsert({
    where: { username: asm.username },
    update: {},
    create: {
      name: asm.name,
      username: asm.username,
      passwordHash: asmPasswordHash,
      role: asm.role,
      asmDealerships: { connect: [{ id: dealership.id }] },
    },
  });

  const adminPasswordHash = await bcrypt.hash(admin.password, 10);
  await prisma.user.upsert({
    where: { username: admin.username },
    update: {},
    create: { name: admin.name, username: admin.username, passwordHash: adminPasswordHash, role: admin.role },
  });

  const allUsers = [...dealershipUsers, asm, admin];
  console.log(`Seeded ${allUsers.length} demo users (only if not already present):`);
  for (const u of allUsers) console.log(`  ${u.role.padEnd(5)} -> username: ${u.username}  password: ${u.password}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
