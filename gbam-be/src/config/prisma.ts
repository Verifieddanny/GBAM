import { PrismaClient } from "../generated/prisma/client";

export const prisma = new PrismaClient({
    log: ["query", "error", "warn"]
})

async function verifyPrisma() {
  try {
    await prisma.$connect();
    console.log("Prisma connected to MongoDB");
  } catch (e: any) {
    console.error("Prisma init failed");
    console.error("name:", e?.name);
    console.error("code:", e?.code || e?.errorCode);
    console.error("message:", e?.message);
    console.error("meta:", e?.meta);
    process.exit(1);
  }
}
verifyPrisma();
