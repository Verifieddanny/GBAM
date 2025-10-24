import { Router } from "express";
import {
  createOrUpdateUser,
  getUserByUsername,
  getAllUsers,
  searchUsers,
} from "../controller/user.controller";

const router = Router();

router.post("/", createOrUpdateUser);
router.get("/", getAllUsers);
router.get("/search", searchUsers);
router.get("/:username", getUserByUsername);

export default router;