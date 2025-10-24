import { Request, Response } from "express";
import { prisma } from "../config/prisma";

/**
 * Toggle follow/unfollow between currentUser and target username
 */

export async function toggleFollow(req: Request, res: Response) {
  try {
    const { username } = req.params;
    const { walletAddress } = req.body;

    if (!walletAddress)
      return res.status(400).json({ message: "walletAddress is required" });

    // find both users
    const currentUser = await prisma.user.findUnique({
      where: { walletAddress },
    });
    const targetUser = await prisma.user.findUnique({ where: { username } });

    if (!currentUser || !targetUser)
      return res.status(400).json({ message: "Cannot follow yourself" });

    // check existing relation
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followeeId: {
          followerId: currentUser.id,
          followeeId: targetUser.id,
        },
      },
    });

    if (existing) {
      //unfollow
      await prisma.follow.delete({
        where: {
          followerId_followeeId: {
            followerId: currentUser.id,
            followeeId: targetUser.id,
          },
        },
      });

      return res.json({ message: `Unfollowed ${username}` });
    }

    // follow
    await prisma.follow.create({
      data: {
        followerId: currentUser.id,
        followeeId: targetUser.id,
      },
    });

    res.json({ message: `Now following ${username}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
}

/**
 * Followers list for a user
 */
export async function getFollowers(reg: Request, res: Response) {
  const { username } = reg.params;
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) return res.status(404).json({ message: "User not found" });

  const followers = await prisma.follow.findMany({
    where: { followeeId: user.id },
    include: {
      follower: {
        select: { username: true, avatarUrl: true, displayName: true },
      },
    },
  });

  res.json(followers.map((f) => f.follower));
}

/**
 * Following list for a user
 */
export async function getFollowing(reg: Request, res: Response) {
  const { username } = reg.params;
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) return res.status(404).json({ message: "User not found" });

  const following = await prisma.follow.findMany({
    where: { followerId: user.id },
    include: {followee: { select: {username: true, avatarUrl: true, displayName: true} } },
  });

  res.json(following.map((f) => f.followee));
}


/**
 * Check if walletAddress follows :username
 */
export async function isFollowing(req: Request, res: Response) {
    const { username } = req.params;
    const { walletAddress } = req.query;

    if (!walletAddress)
      return res.status(400).json({ message: "walletAddress is required" });

    const currentUser = await prisma.user.findUnique({ where: {walletAddress: walletAddress as string} });
    const targetUser = await prisma.user.findUnique({where: {username}});

    if (!currentUser || !targetUser)
    return res.status(404).json({ message: "User not found" });

    const relation = await prisma.follow.findUnique({
    where: {
      followerId_followeeId: {
        followerId: currentUser.id,
        followeeId: targetUser.id,
      },
    },
  });

  res.json({ isFollowing: !!relation });
}