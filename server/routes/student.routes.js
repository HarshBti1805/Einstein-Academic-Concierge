import express from "express";
import prisma from "../db.js";

const router = express.Router();

// CREATE
router.post("/", async (req, res) => {
  const student = await prisma.student.create({
    data: req.body,
  });
  res.status(201).json(student);
});

// READ ALL
router.get("/", async (_, res) => {
  const students = await prisma.student.findMany({
    include: { discipline: true },
  });
  res.json(students);
});

// READ ONE
router.get("/:id", async (req, res) => {
  const student = await prisma.student.findUnique({
    where: { id: req.params.id },
  });
  res.json(student);
});

// UPDATE
router.put("/:id", async (req, res) => {
  const updated = await prisma.student.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(updated);
});

// DELETE
router.delete("/:id", async (req, res) => {
  await prisma.student.delete({
    where: { id: req.params.id },
  });
  res.sendStatus(204);
});

export default router;
