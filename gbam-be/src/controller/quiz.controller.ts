import { Request, Response } from "express";
import * as svc from "../services/quiz.service";

export async function createCategory(req: Request, res: Response) {
  try {
    const { name, slug } = req.body;
    if (!name || !slug)
      return res.status(400).json({ message: "name and slug required" });
    const cat = await svc.createCategory({ name, slug });
    res.json(cat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function listCategories(_req: Request, res: Response) {
  const cats = await svc.listCategories();
  res.json(cats);
}

export async function addPoolQuestion(req: Request, res: Response) {
  try {
    const { categorySlug, question, rightAnswer, wrongAnswer } = req.body;
    if (!categorySlug || !question || !rightAnswer || !wrongAnswer) {
      return res.status(400).json({
        message: "categorySlug, question, rightAnswer, wrongAnswer required",
      });
    }
    const q = await svc.addPoolQuestion({
      categorySlug,
      question,
      rightAnswer,
      wrongAnswer,
    });
    res.json(q);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function listPoolQuestions(req: Request, res: Response) {
  const { categorySlug, limit = "50", cursor } = req.query as any;
  const data = await svc.listPoolQuestions({
    categorySlug,
    limit: parseInt(limit),
    cursor,
  });
  res.json(data);
}

export async function generateDailyQuiz(req: Request, res: Response) {
  try {
    const { dayKey, perCategory = 3 } = req.body;
    const result = await svc.generateDailyQuiz({ dayKey, perCategory });
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getTodayQuiz(_req: Request, res: Response) {
  const data = await svc.getTodayQuiz();
  if (!data) return res.status(404).json({ message: "No quiz for today yet" });
  res.json(data);
}

export async function checkAnswers(req: Request, res: Response) {
  try {
    const result = await svc.checkAnswers(req.body);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
}

export async function finalizeDailyAttempt(req: Request, res: Response) {
  try {
    const result = await svc.finalizeDailyAttempt(req.body);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
}

export async function submitCategoryQuiz(req: Request, res: Response) {
  try {
    const result = await svc.submitCategoryQuiz(req.body);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
}
