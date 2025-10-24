import { prisma } from "../config/prisma";
import { encodeCursor, decodeCursor } from "../utils/cursor";

type CreateMemeInput = {
  mediaUrl: string;
  mediaHash: string;
  caption?: string;
};
type Page = { limit: number; cursor?: string };

// create
export async function createMeme(authorId: string, data: CreateMemeInput) {
  const meme = await prisma.meme.create({
    data: {
      authorId,
      mediaUrl: data.mediaUrl,
      mediaHash: data.mediaHash,
      caption: data.caption,
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          displayName: true,
        },
      },
    },
  });

  return shapeMeme(meme);
}

// GLOBAL endless feed
export async function getGlobalFeed(page: Page) {
  const { limit, cursor } = page;

  const where = cursor
    ? (() => {
        const { createdAt, id } = decodeCursor(cursor);
        return {
          OR: [
            { createdAt: { lt: createdAt } },
            { createdAt: createdAt, id: { lt: id } },
          ],
        };
      })()
    : {};

  const items = await prisma.meme.findMany({
    where,
    take: limit + 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      author: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          displayName: true,
        },
      },
    },
  });

  const { pageItems, nextCursor } = pageOut(items, limit);
  return { items: pageItems.map(shapeMeme), nextCursor };
}

// FOLLOWING endless feed
export async function getFollowingFeed(userId: string, page: Page) {
  const { limit, cursor } = page;

  const followees = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followeeId: true },
  });
  const followeeIds = followees.map((f) => f.followeeId);

  if (followeeIds.length === 0) return { items: [], nextCursor: null };

  //@ts-ignore
  const whereBase: any = { authorId: { in: followeeIds } };
  const where = cursor
    ? (() => {
        const { createdAt, id } = decodeCursor(cursor);
        return {
          AND: [
            whereBase,
            {
              OR: [
                { createdAt: { lt: createdAt } },
                { createdAt: createdAt, id: { lt: id } },
              ],
            },
          ],
        };
      })()
    : whereBase;

  const items = await prisma.meme.findMany({
    where,
    take: limit + 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      author: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          displayName: true,
        },
      },
    },
  });

  const { pageItems, nextCursor } = pageOut(items, limit);
  return { items: pageItems.map(shapeMeme), nextCursor };
}

// a user’s memes, endless scroll with compound cursor
export async function getUserMemes(userId: string, page: Page) {
  const { limit, cursor } = page;

  const whereBase: any = { authorId: userId };
  const where = cursor
    ? (() => {
        const { createdAt, id } = decodeCursor(cursor);
        return {
          AND: [
            whereBase,
            {
              OR: [
                { createdAt: { lt: createdAt } },
                { createdAt: createdAt, id: { lt: id } },
              ],
            },
          ],
        };
      })()
    : whereBase;

  const items = await prisma.meme.findMany({
    where,
    take: limit + 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      author: { select: { id: true, username: true, avatarUrl: true, displayName: true } },
    },
  });

  const { pageItems, nextCursor } = pageOut(items, limit);
  return { items: pageItems.map(shapeMeme), nextCursor };
}


export async function getMemeById(id: string) {
  const meme = await prisma.meme.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          displayName: true,
        },
      },
    },
  });
  return meme ? shapeMeme(meme) : null;
}

export async function deleteMeme(id: string, userId: string) {
  const meme = await prisma.meme.findUnique({ where: { id } });
  if (!meme) return false;
  if (meme.authorId !== userId) return false;

  await prisma.$transaction([
    prisma.memeVote.deleteMany({ where: { memeId: id } }),
    prisma.meme.delete({ where: { id } }),
  ]);
  return true;
}

export async function voteMeme(memeId: string, userId: string, vote: 1 | -1) {
  const meme = await prisma.meme.findUnique({ where: { id: memeId } });
  if (!meme) return null;

  const prev = await prisma.memeVote.findUnique({
    where: { memeId_userId: { memeId, userId } },
  });

  if (!prev) {
    await prisma.$transaction([
      prisma.memeVote.create({ data: { memeId, userId, vote } }),
      prisma.meme.update({
        where: { id: memeId },
        data:
          vote === 1
            ? { upCount: { increment: 1 } }
            : { downCount: { increment: 1 } },
      }),
    ]);
  } else if (prev.vote !== vote) {
    await prisma.$transaction([
      prisma.memeVote.update({
        where: { memeId_userId: { memeId, userId } },
        data: { vote },
      }),
      prisma.meme.update({
        where: { id: memeId },
        data:
          prev.vote === 1
            ? { upCount: { decrement: 1 }, downCount: { increment: 1 } }
            : { downCount: { decrement: 1 }, upCount: { increment: 1 } },
      }),
    ]);
  }

  const updated = await prisma.meme.findUnique({
    where: { id: memeId },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          displayName: true,
        },
      },
    },
  });

  return updated ? shapeMeme(updated) : null;
}

// Helper to compute nextCursor
//@ts-ignore
function pageOut(items: any[], limit: number) {
  let nextCursor: string | null = null;
  if (items.length > limit) {
    const extra = items.pop(); // remove the +1
    // compute cursor from the last item on this page
    const last = items[items.length - 1];
    nextCursor = encodeCursor(last.createdAt, last.id);
  } else if (items.length > 0) {
    const last = items[items.length - 1];
    nextCursor = encodeCursor(last.createdAt, last.id);
  }
  return { pageItems: items, nextCursor };
}

// shape response
//@ts-ignore
function shapeMeme(m: any) {
  return {
    id: m.id,
    createdAt: m.createdAt,
    author: m.author,
    mediaUrl: m.mediaUrl,
    mediaHash: m.mediaHash,
    caption: m.caption,
    upCount: m.upCount,
    downCount: m.downCount,
  };
}
