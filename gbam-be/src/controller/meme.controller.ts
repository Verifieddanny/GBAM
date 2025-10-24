import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import * as service from "../services/meme.service";

export async function createMeme(req: Request, res: Response) {
  try {
    const { walletAddress, mediaUrl, mediaHash, caption } = req.body;
    if (!walletAddress || !mediaUrl || !mediaHash) {
      return res
        .status(400)
        .json({ message: "walletAddress, mediaUrl, mediaHash are required" });
    }

    const author = await prisma.user.findUnique({ where: { walletAddress } });
    if (!author) return res.status(404).json({ message: "Author not found" });

    const meme = await service.createMeme(author.id, {
      mediaUrl,
      mediaHash,
      caption,
    });
    res.json(meme);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getGlobalFeed(req: Request, res: Response) {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "20"), 50);
    const cursor = req.query.cursor as string | undefined;
    const data = await service.getGlobalFeed({ limit, cursor });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getFollowingFeed(req: Request, res: Response) {
  try {
    const walletAddress = req.query.walletAddress as string;
    if (!walletAddress)
      return res.status(400).json({ message: "walletAddress is required" });

    const user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const limit = Math.min(parseInt((req.query.limit as string) || "20"), 50);
    const cursor = req.query.cursor as string | undefined;

    const data = await service.getFollowingFeed(user.id, { limit, cursor });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getUserMemes(req: Request, res: Response) {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const limit = Math.min(parseInt((req.query.limit as string) || "20"), 50);
    const cursor = req.query.cursor as string | undefined;

    const data = await service.getUserMemes(user.id, { limit, cursor });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getMemeById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const meme = await service.getMemeById(id);
    if (!meme) return res.status(404).json({ message: "Meme not found" });
    res.json(meme);
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
}

export async function deleteMeme(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ message: "walletAddress required" });

    const user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const ok = await service.deleteMeme(id, user.id);
    if (!ok) return res.status(403).json({ message: "Not allowed" });

    res.json({ message: "Deleted" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
}

export async function voteMeme(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { walletAddress, vote } = req.body as { walletAddress: string, vote: 1 | -1 };
    
    if (!walletAddress || ![1, -1].includes(vote)) {
      return res.status(400).json({ message: "walletAddress and vote 1 or -1 required" });
    }

    const user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const result = await service.voteMeme(id, user.id, vote);
    if (!result) return res.status(404).json({ message: "Meme not found" });

    res.json(result);
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
}