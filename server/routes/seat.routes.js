import express from "express";
import { getSeatConfig, bookSeat } from "../controllers/seat.controller.js";

const router = express.Router();

router.get("/:courseId", getSeatConfig);
router.post("/:courseId/book", bookSeat);

export default router;
