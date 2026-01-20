import express from "express";
import { loginStudent, verifyToken, loginUniversity } from "../controllers/auth.controller.js";

const router = express.Router();

// POST /api/auth/login - Login/authenticate a student
router.post("/login", loginStudent);

// GET /api/auth/verify - Verify JWT token
router.get("/verify", verifyToken);

export default router;
