import express from "express";
import prisma from "../db.js";

const router = express.Router();

// AUTO-REGISTER WITH CAPACITY CHECK
router.post("/", async (req, res) => {
  const { courseId } = req.body;

  const enrolledCount = await prisma.enrollment.count({
    where: {
      courseId,
      status: "enrolled"
    }
  });

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (enrolledCount >= course.capacity) {
    req.body.status = "waitlisted";
  }

  const enrollment = await prisma.enrollment.create({
    data: req.body
  });
  res.status(201).json(enrollment);
});

router.get("/", async (_, res) => {
  res.json(await prisma.enrollment.findMany({
    include: {
      student: true,
      course: true
    }
  }));
});

router.delete("/:id", async (req, res) => {
  await prisma.enrollment.delete({ where: { id: req.params.id } });
  res.sendStatus(204);
});

export default router;
