import express from "express";
import { getStudentProfile, getAllStudents } from "../controllers/student.controller.js";

const router = express.Router();

router.get("/", getAllStudents);
router.get("/:id", getStudentProfile);

export default router;
