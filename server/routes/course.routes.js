import express from "express";
import prisma from "../db.js";

const router = express.Router();

router.post("/", async (req, res) => {
  res.status(201).json(await prisma.course.create({ data: req.body }));
});

router.get("/", async (_, res) => {
  res.json(await prisma.course.findMany({ include: { discipline: true } }));
});

router.get("/:id", async (req, res) => {
  res.json(await prisma.course.findUnique({ where: { id: req.params.id } }));
});

router.put("/:id", async (req, res) => {
  res.json(await prisma.course.update({ where: { id: req.params.id }, data: req.body }));
});

router.delete("/:id", async (req, res) => {
  await prisma.course.delete({ where: { id: req.params.id } });
  res.sendStatus(204);
});

export default router;

