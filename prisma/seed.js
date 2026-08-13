require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEALERSHIP_NAME = "Prime Motors - Andheri";

const users = [
  { name: "Aarav Sharma", username: "sc1", password: "sc123", role: "SC" },
  { name: "Priya Nair", username: "cre1", password: "cre123", role: "CRE" },
  { name: "Rohan Mehta", username: "sm1", password: "sm123", role: "SM" },
  { name: "Kavita Rao", username: "asm1", password: "asm123", role: "ASM" },
];

async function main() {
  const dealership = await prisma.dealership.upsert({
    where: { name: DEALERSHIP_NAME },
    update: {},
    create: { name: DEALERSHIP_NAME },
  });

  for (const u of users) {
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

  console.log(`Seeded ${users.length} demo users for dealership "${DEALERSHIP_NAME}":`);
  for (const u of users) console.log(`  ${u.role.padEnd(4)} -> username: ${u.username}  password: ${u.password}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
