(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};


import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./config/prisma";
import userRoutes from "./routes/user.routes";
import followRoutes from "./routes/follow.routes"
import memeRoutes from "./routes/meme.routes"
import quizRoutes from "./routes/quiz.routes";




dotenv.config({ path: ".env.local" });
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// health check

app.get("/", (_, res) => {
  res.json({ message: "Gbam backend running 🚀" });
});

// routes
app.use("/api/users", userRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/memes", memeRoutes);
app.use("/api/quiz", quizRoutes);

// graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
