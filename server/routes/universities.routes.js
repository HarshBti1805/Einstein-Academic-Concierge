import express from "express";
import { loginUniversity } from "../controllers/auth.controller.js";

const router = express.Router();

// POST /api/universities/login - Login university admin with access code
router.post("/login", loginUniversity);

export default router;
