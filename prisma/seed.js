require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEALERSHIP_NAME = "Prime Motors - Andheri";

const dealershipUsers = [
  { name: "Aarav Sharma", username: "sc1", password: "sc123", role: "SC" },
  { name: "Priya Nair", username: "cre1", password: "cre123", role: "CRE" },
  { name: "Rohan Mehta", username: "sm1", password: "sm123", role: "SM" },
  { name: "Kavita Rao", username: "asm1", password: "asm123", role: "ASM" },
];

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
      update: {
        name: u.name,
        passwordHash,
        role: u.role,
        dealershipId: dealership.id,
      },
      create: {
        name: u.name,
        username: u.username,
        passwordHash,
        role: u.role,
        dealershipId: dealership.id,
      },
    });
  }

  const adminPasswordHash = await bcrypt.hash(admin.password, 10);
  await prisma.user.upsert({
    where: { username: admin.username },
    update: { name: admin.name, passwordHash: adminPasswordHash, role: admin.role, dealershipId: null },
    create: { name: admin.name, username: admin.username, passwordHash: adminPasswordHash, role: admin.role, dealershipId: null },
  });

  const allUsers = [...dealershipUsers, admin];
  console.log(`Seeded ${allUsers.length} demo users:`);
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
