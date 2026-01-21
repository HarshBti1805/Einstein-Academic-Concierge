import express from "express";
import cors from "cors";
import { createServer } from "http";
import "dotenv/config";

import authRoutes from "./routes/auth.routes.js";
import studentRoutes from "./routes/student.routes.js";
import courseRoutes from "./routes/course.routes.js";
import enrollmentRoutes from "./routes/enrollment.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import seatRoutes from "./routes/seat.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import universitiesRoutes from "./routes/universities.routes.js";
import registrationRoutes, { setRegistrationService } from "./routes/registration.routes.js";

// Import services for auto-registration system
import WebSocketService from "./services/WebSocketService.js";
import RegistrationService from "./services/RegistrationService.js";
import prisma from "./db.js";

const app = express();

// Create HTTP server (needed for WebSocket)
const httpServer = createServer(app);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Initialize WebSocket service
const wsService = new WebSocketService(httpServer);

// Initialize Registration service
const registrationService = new RegistrationService(prisma);
registrationService.setWebSocketService(wsService);

// Set registration service for routes
setRegistrationService(registrationService);

// Initialize registration service (load waitlists)
registrationService.initialize().then(() => {
  console.log("Registration service initialized");
}).catch(err => {
  console.error("Failed to initialize registration service:", err);
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Server is running",
    websocket: {
      clients: wsService.getConnectedClientsCount(),
      watchedCourses: wsService.getWatchedCourses().length
    }
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/seats", seatRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/universities", universitiesRoutes);
app.use("/api/registration", registrationRoutes);

const PORT = process.env.PORT || 8080;

// Use httpServer instead of app.listen() for WebSocket support
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket service ready for real-time updates`);
});