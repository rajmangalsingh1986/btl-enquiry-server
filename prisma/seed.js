require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Only the admin account is bootstrapped automatically - it's what lets
// someone log in at all on a brand-new database and set up real
// dealerships/users through the Admin UI. The demo dealership and
// SC/CRE/SM/ASM accounts this used to also create are gone: once real data
// exists, an admin deleting that demo data expects it to stay deleted, not
// get silently recreated the next time the server cold-starts and this
// script runs again (which is exactly what was happening before).
const admin = { name: "Admin", username: "admin1", password: "admin123", role: "ADMIN" };

async function main() {
  const passwordHash = await bcrypt.hash(admin.password, 10);
  await prisma.user.upsert({
    where: { username: admin.username },
    update: {},
    create: { name: admin.name, username: admin.username, passwordHash, role: admin.role },
  });

  console.log(`Ensured admin account exists (created only if missing): ${admin.username} / ${admin.password}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
