import express from "express";

import studentRoutes from "./routes/student.routes.js";
import courseRoutes from "./routes/course.routes.js";
import enrollmentRoutes from "./routes/enrollment.routes.js";

const app = express();
app.use(express.json());

app.use("/api/students", studentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);

app.listen(8080, () => {
  console.log("Server running on port 8080");
});