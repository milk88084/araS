import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.insurance.findFirst({
    where: { policyNumber: "9199739473" },
  });

  if (existing) {
    console.log("Cathay Life policy already seeded — skipping.");
    return;
  }

  const entry = await prisma.entry.create({
    data: {
      name: "國泰人壽禄美鑫利率變動型美元終身壽險（定期給付型）",
      topCategory: "固定資產",
      subCategory: "保險",
      value: 15000,
    },
  });

  await prisma.entryHistory.create({
    data: {
      entryId: entry.id,
      delta: 15000,
      balance: 15000,
    },
  });

  await prisma.insurance.create({
    data: {
      entryId: entry.id,
      policyNumber: "9199739473",
      insurer: "Cathay Life Insurance",
      currency: "USD",
      declaredRate: 0,
      premiumTotal: null,
      currentAge: 0,
      startDate: new Date("2020-06-30"),
      cashValueData: [],
      sumInsured: 15000,
      surrenderValue: 0,
      accumulatedBonus: 0,
      accumulatedSumIncrease: 0,
      isPeriodicPayout: true,
    },
  });

  console.log("Seeded Cathay Life policy.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
