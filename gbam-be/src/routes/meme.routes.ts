import { Router } from "express";
import {
  createMeme,
  getGlobalFeed,
  getFollowingFeed,
  getUserMemes,
  getMemeById,
  deleteMeme,
  voteMeme,
} from "../controller/meme.controller";

const router = Router();

router.post("/", createMeme);

router.get("/", getGlobalFeed);
router.get("/following", getFollowingFeed)

router.get("/user/:username", getUserMemes);
router.get("/:id", getMemeById);
router.delete("/:id", deleteMeme);
router.post("/:id/vote", voteMeme)

export default router;