import express from "express";
import { startChat, sendMessage, getRecommendations, getStudentContext } from "../controllers/chat.controller.js";

const router = express.Router();

// POST /api/chat/start - Start a new chat session
router.post("/start", startChat);

// POST /api/chat/message - Send a message and get response
router.post("/message", sendMessage);

// POST /api/chat/recommend - Get course recommendations
router.post("/recommend", getRecommendations);

// GET /api/chat/context/:student_id - Get student context for chat
router.get("/context/:student_id", getStudentContext);

export default router;
