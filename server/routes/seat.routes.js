import express from "express";
import { 
    getSeatConfig, 
    getSeatConfigByCode, 
    getAllSeatConfigs, 
    bookSeat,
    releaseSeat 
} from "../controllers/seat.controller.js";

const router = express.Router();

// GET /api/seats - Get all seat configurations
router.get("/", getAllSeatConfigs);

// GET /api/seats/course/:courseCode - Get seat config by course code (e.g., CS101)
router.get("/course/:courseCode", getSeatConfigByCode);

// GET /api/seats/:courseId - Get seat config by internal ID
router.get("/:courseId", getSeatConfig);

// POST /api/seats/:courseId/book - Book seats for a course
router.post("/:courseId/book", bookSeat);

// POST /api/seats/:courseId/release - Release a seat
router.post("/:courseId/release", releaseSeat);

export default router;
