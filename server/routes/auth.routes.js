import express from "express";
import {
  loginStudent,
  returningLogin,
  verifyToken,
  loginUniversity,
} from "../controllers/auth.controller.js";

const router = express.Router();

// POST /api/auth/login - Login/register (full form) for new students
router.post("/login", loginStudent);

// POST /api/auth/returning-login - Simple login for returning students (email + rollNumber)
router.post("/returning-login", returningLogin);

// GET /api/auth/verify - Verify JWT token
router.get("/verify", verifyToken);

export default router;
