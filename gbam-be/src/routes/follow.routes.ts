import { Router } from "express";
import {
  toggleFollow,
  getFollowers,
  getFollowing,
  isFollowing,
} from "../controller/follow.controller";


const router = Router();


// toggle follow / unfollow
router.post("/:username/toggle", toggleFollow);

// list followers for a user
router.get("/:username/followers", getFollowers);

// list following for a user
router.get("/:username/following", getFollowing);

// check if current user is following another user
router.get("/:username/check", isFollowing);

export default router;