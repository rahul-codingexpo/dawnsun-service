import express from "express";
import Log from "../models/log.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// 📘 Save user login log
router.post("/add", protect, async (req, res) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

    const { name, email, department } = req.user;

    const log = await Log.create({
      name,
      email,
      department,
      ip,
    });

    res.status(201).json({ message: "Log created", log });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating log" });
  }
});

// 📘 Get all logs (Admin only)
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const logs = await Log.find().sort({ dateTime: -1 });
    res.status(200).json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching logs" });
  }
});

export default router;
