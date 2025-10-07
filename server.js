import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import authRoutes from "./routes/auth.js";
import companyRoutes from "./routes/companies.js";
import itemRoutes from "./routes/itemRoutes.js";
import travelRoutes from "./routes/travelApplications.js";
import leave from "./routes/leaveRoutes.js";
import accessRoutes from "./routes/accessRoutes.js";
import logRoutes from "./routes/logRoutes.js";

dotenv.config();
const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000", // frontend URL
    credentials: true, // allow cookies/auth headers
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/items", itemRoutes); // updated to match frontend
app.use("/api/travel", travelRoutes);
app.use("/api/leaves", leave);
app.use("/api/access-request", accessRoutes);
app.use("/api/logs", logRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(5000, () => console.log("Server running on port 5000"));
    // console.log("API KEY:", process.env.AISENSY_API_KEY);
  })
  .catch((err) => console.log(err));
