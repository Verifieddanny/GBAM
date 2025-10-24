import { Request, Response } from "express";
import { prisma } from "../config/prisma";

export async function createOrUpdateUser(req: Request, res: Response) {
  try {
    const {
      walletAddress,
      username,
      displayName,
      avatarUrl,
      bio,
      xLink,
      otherLink,
    } = req.body;

    if (!walletAddress || !username)
      return res
        .status(400)
        .json({ message: "walletAddress and username are required" });

    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: { username, displayName, avatarUrl, bio, xLink, otherLink },
      create: {
        walletAddress,
        username,
        displayName,
        avatarUrl,
        bio,
        xLink,
        otherLink,
      },
    });

    res.json({ message: "User profile saved", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
}

export async function getAllUsers(_: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      walletAddress: true,
    },
  });

  res.json(users);
}

export async function getUserByUsername(req: Request, res: Response) {
  const { username } = req.params;

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      followers: true,
      following: true,
    },
  });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
}

export async function searchUsers(req: Request, res: Response) {
  const { q } = req.query;
  if (!q) return res.json([]);
  const users = await prisma.user.findMany({
    where: { username: { contains: q as string, mode: "insensitive" } },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });
  res.json(users);
}
