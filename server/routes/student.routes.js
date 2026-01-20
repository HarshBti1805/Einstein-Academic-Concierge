import express from "express";
import { getStudentProfile, getAllStudents, getStudentDashboardData } from "../controllers/student.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getAllStudents);

// Protected route - get dashboard data for authenticated user
router.get("/me/dashboard", authenticateToken, getStudentDashboardData);

// Get dashboard data by student ID (also protected)
router.get("/:id/dashboard", authenticateToken, getStudentDashboardData);

router.get("/:id", getStudentProfile);

export default router;
