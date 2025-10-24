import { PrismaClient } from "../src/generated/prisma/client";
const prisma = new PrismaClient();

async function main() {
  // categories
  const cats = [
    { name: "How Nigerian Are You", slug: "how-nigerian" },
    { name: "History", slug: "history" },
    { name: "Afrobeats", slug: "afrobeats" },
    { name: "Pop Culture", slug: "pop-culture" },
  ];

  for (const c of cats) {
    await prisma.quizCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: c,
    });
  }

  const cat = async (slug: string) => prisma.quizCategory.findUnique({ where: { slug } });

  // daily themed questions, for the “how-nigerian” category
  const howN = await cat("how-nigerian");
  if (howN) {
    const dailyQs = [
      {
        question: "On a Saturday morning, what will you use to eat Akara",
        rightAnswer: "Bread",
        wrongAnswer: "Butter",
      },
      {
        question: "When NEPA takes light, what do you say first",
        rightAnswer: "Up NEPA",
        wrongAnswer: "God abeg",
      },
      {
        question: "Popular combo for evening snack on Lagos street",
        rightAnswer: "Agege bread and ewa aganyin",
        wrongAnswer: "Croissant and jam",
      },
    ];
    for (const q of dailyQs) {
      await prisma.quizPoolQuestion.create({
        data: { categoryId: howN.id, ...q }
      });
    }
  }

  // history
  const hist = await cat("history");
  if (hist) {
    const hQs = [
      {
        question: "Who was Nigeria’s first Prime Minister",
        rightAnswer: "Abubakar Tafawa Balewa",
        wrongAnswer: "Nnamdi Azikiwe",
      },
      {
        question: "In what year did Nigeria gain independence",
        rightAnswer: "1960",
        wrongAnswer: "1963",
      },
    ];
    for (const q of hQs) {
      await prisma.quizPoolQuestion.create({ data: { categoryId: hist.id, ...q } });
    }
  }

  // afrobeats
  const afro = await cat("afrobeats");
  if (afro) {
    const aQs = [
      {
        question: "Which artist popularized the phrase 30BG",
        rightAnswer: "Davido",
        wrongAnswer: "Wizkid",
      },
      {
        question: "Fela’s primary instrument",
        rightAnswer: "Saxophone",
        wrongAnswer: "Violin",
      },
    ];
    for (const q of aQs) {
      await prisma.quizPoolQuestion.create({ data: { categoryId: afro.id, ...q } });
    }
  }

  console.log("Seed complete");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
