import { prisma } from "../config/prisma";
import { todayKey } from "../utils/daykey";
import { encodeCursor, decodeCursor } from "../utils/cursor";

type CreateCategory = { name: string; slug: string };
type AddPoolQ = {
  categorySlug: string;
  question: string;
  rightAnswer: string;
  wrongAnswer: string;
};
type ListPool = { categorySlug?: string; limit: number; cursor?: string };
type GenerateDaily = { dayKey?: string; perCategory?: number };
type SubmitAttempt = {
  walletAddress: string;
  dayKey?: string;
  answers: Array<{ questionId: string; answer: string }>;
};

// categories
export async function createCategory(input: CreateCategory) {
  return prisma.quizCategory.create({ data: input });
}
export async function listCategories() {
  return prisma.quizCategory.findMany({ orderBy: { name: "asc" } });
}

// pool add
export async function addPoolQuestion(input: AddPoolQ) {
  const cat = await prisma.quizCategory.findUnique({
    where: { slug: input.categorySlug },
  });

  if (!cat) throw new Error("Category not found");

  return prisma.quizPoolQuestion.create({
    data: {
      categoryId: cat.id,
      question: input.question,
      rightAnswer: input.rightAnswer,
      wrongAnswer: input.wrongAnswer,
    },
  });
}

// generateDailyQuiz, force only from daily category
export async function generateDailyQuiz(input: GenerateDaily) {
  const day = input.dayKey || todayKey();

  const existing = await prisma.dailyQuiz
    .findUnique({ where: { dayKey: day } })
    .catch(() => null);
  if (existing) return existing;

  // pick from the dedicated daily category only
  const dailyCat = await prisma.quizCategory.findUnique({
    where: { slug: "how-nigerian" },
  });
  if (!dailyCat) throw new Error("Missing category 'how-nigerian'");

  // exactly one per day
  const one = await prisma.quizPoolQuestion.findMany({
    where: { categoryId: dailyCat.id },
    take: 1,
    orderBy: { createdAt: "desc" }, // you can replace with random selection later
    select: { id: true },
  });
  if (one.length === 0) throw new Error("No questions available for daily");

  const questionIds = [one[0].id];
  const packHash = `daily:${day}:${questionIds.join(",")}`;

  return prisma.dailyQuiz.create({
    data: { dayKey: day, questionIds, packHash },
  });
}

export async function getTodayQuiz() {
  const day = todayKey();
  const dq = await prisma.dailyQuiz
    .findUnique({ where: { dayKey: day } })
    .catch(() => null);
  if (!dq) return null;

  const q = await prisma.quizPoolQuestion.findUnique({
    where: { id: dq.questionIds[0] },
    include: { category: true },
  });
  if (!q) return null;

  return {
    dayKey: dq.dayKey,
    packHash: dq.packHash,
    question: {
      id: q.id,
      category: q.category.slug,
      question: q.question,
      choices: [q.rightAnswer, q.wrongAnswer],
    },
  };
}

// listPoolQuestions, exclude today's daily questions by default
export async function listPoolQuestions(input: ListPool) {
  const day = todayKey();
  const todayDaily = await prisma.dailyQuiz
    .findUnique({ where: { dayKey: day } })
    .catch(() => null);
  const excludeIds = todayDaily ? todayDaily.questionIds : [];

  const baseCategoryFilter = input.categorySlug
    ? { category: { slug: input.categorySlug } }
    : {};

  // If the client is browsing categories, we should hide today's daily questions,
  // except when the client explicitly asks for the daily category itself and you want to inspect it.
  const whereBase: any = {
    ...baseCategoryFilter,
    ...(input.categorySlug !== "how-nigerian"
      ? { id: { notIn: excludeIds } }
      : {}),
  };

  const where = input.cursor
    ? (() => {
        const { createdAt, id } = decodeCursor(input.cursor!);
        return {
          AND: [
            whereBase,
            {
              OR: [
                { createdAt: { lt: createdAt } },
                { createdAt, id: { lt: id } },
              ],
            },
          ],
        };
      })()
    : whereBase;

  const items = await prisma.quizPoolQuestion.findMany({
    where,
    take: input.limit + 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { category: true },
  });

  const { pageItems, nextCursor } = pageOut(items, input.limit);
  return { items: pageItems, nextCursor };
}

// checkAnswers — dry run, no DB writes
export async function checkAnswers(input: SubmitAttempt) {
  const user = await prisma.user.findUnique({
    where: { walletAddress: input.walletAddress },
  });
  if (!user) throw new Error("User not found");

  const day = input.dayKey || todayKey();
  const dq = await prisma.dailyQuiz
    .findUnique({ where: { dayKey: day } })
    .catch(() => null);
  if (!dq) throw new Error("No quiz for day");

  const q = await prisma.quizPoolQuestion.findUnique({
    where: { id: dq.questionIds[0] },
    select: { id: true, rightAnswer: true },
  });
  if (!q) throw new Error("Question not found");

  // take the first provided answer, or scan the array, both are fine
  let correct = 0;
  for (const a of input.answers) {
    if (
      a.questionId === q.id &&
      normalize(a.answer) === normalize(q.rightAnswer)
    ) {
      correct = 1;
      break;
    }
  }

  const earned = correct === 1 ? 10 : 0;
  return { correctCount: correct, earnedGBM: earned.toString() };
}

// submit attempt, one per day, compute score, record earnings
export async function finalizeDailyAttempt(
  input: SubmitAttempt & { earned: number; correctCount: number }
) {
  const user = await prisma.user.findUnique({
    where: { walletAddress: input.walletAddress },
  });
  if (!user) throw new Error("User not found");

  const day = input.dayKey || todayKey();
  const dq = await prisma.dailyQuiz
    .findUnique({ where: { dayKey: day } })
    .catch(() => null);
  if (!dq) throw new Error("No quiz for day");

  const exists = await prisma.quizAttempt
    .findUnique({
      where: { dayKey_userId: { dayKey: day, userId: user.id } },
    })
    .catch(() => null);

  if (exists) {
    return {
      alreadyClaimed: true,
      correctCount: exists.correctCount,
      earnedGBM: exists.earnedGBM.toString(),
    };
  }

  const earned = BigInt(input.earned);
  const correct = input.correctCount; // 0 or 1

  await prisma.$transaction(async (tx) => {
    await tx.quizAttempt.create({
      data: {
        dayKey: day,
        userId: user.id,
        correctCount: input.answers.length,
        earnedGBM: earned,
      },
    });
    if (earned > BigInt(0)) {
      await tx.earnings.create({
        data: {
          userId: user.id,
          source: "quiz",
          amountGBM: earned,
          dayKey: day,
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          xp: { increment: correct }, // 1 if correct, else 0
          gbmBalance: { increment: earned },
        },
      });
    }
  });

  return {
    alreadyClaimed: false,
    correctCount: correct,
    earnedGBM: earned.toString(),
  };
}

export async function submitCategoryQuiz(input: SubmitAttempt) {
  const user = await prisma.user.findUnique({
    where: { walletAddress: input.walletAddress },
  });
  if (!user) throw new Error("User not found");

  const qMap = await prisma.quizPoolQuestion.findMany({
    where: { id: { in: input.answers.map((a) => a.questionId) } },
    select: { id: true, rightAnswer: true },
  });
  const correctSet = new Map(qMap.map((q) => [q.id, q.rightAnswer]));

  let correct = 0;
  for (const a of input.answers) {
    const right = correctSet.get(a.questionId);
    if (right && normalize(a.answer) === normalize(right)) correct++;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { xp: { increment: correct } },
  });

  return { correctCount: correct, xpEarned: correct };
}

// helpers
function normalize(s: string) {
  return s.trim().toLowerCase();
}

function pageOut(items: any[], limit: number) {
  let nextCursor: string | null = null;
  if (items.length > limit) {
    items.pop();
    const last = items[items.length - 1];
    nextCursor = encodeCursor(last.createdAt, last.id);
  } else if (items.length > 0) {
    const last = items[items.length - 1];
    nextCursor = encodeCursor(last.createdAt, last.id);
  }
  return { pageItems: items, nextCursor };
}
