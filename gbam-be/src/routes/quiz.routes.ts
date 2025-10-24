import { Router } from "express";
import {
  createCategory,
  listCategories,
  addPoolQuestion,
  listPoolQuestions,
  generateDailyQuiz,
  getTodayQuiz,
  checkAnswers,
  finalizeDailyAttempt,
  submitCategoryQuiz,
} from "../controller/quiz.controller";

const router = Router();

// categories
router.post("/categories", createCategory);
router.get("/categories", listCategories);

// question pool
router.post("/pool", addPoolQuestion);
router.get("/pool", listPoolQuestions);

// daily quiz
router.post("/daily/generate", generateDailyQuiz); // admin or cron
router.get("/daily/today", getTodayQuiz);
router.post("/daily/check", checkAnswers);
router.post("/daily/attempt", finalizeDailyAttempt);

router.post("/category/attempt", submitCategoryQuiz);


export default router;