import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import twilio from "twilio"; // for WhatsApp OTP
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import Log from "../models/log.js";
const router = express.Router();

// Twilio setup (replace with your creds)
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const whatsappFrom = "whatsapp:+14155238886"; // Twilio sandbox WhatsApp number

// =============================
// REGISTER (Admin or User)
// =============================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, mobile } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      mobile,
      role: role || "User", // default is "User"
      password: hashedPassword,
    });

    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =============================
// LOGIN
// =============================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // res.json({
    //   token,
    //   user: {
    //     id: user._id,
    //     name: user.name,
    //     email: user.email,
    //     role: user.role,
    //   },
    // });
    // Capture client IP
    const ipAddress =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown";

    // Save login log
    await Log.create({
      name: user.name,
      email: user.email,
      department: user.department || "Not Assigned",
      ip: ipAddress,
      loginTime: new Date(),
    });

    // Send response
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || "Not Assigned",
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =============================
// GET LOGGED-IN USER PROFILE
// =============================
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("companyId");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// =============================
// FORGOT PASSWORD - Send OTP (WhatsApp)
// =============================
router.post("/forgot-password", async (req, res) => {
  try {
    const { mobile } = req.body;

    const user = await User.findOne({ mobile });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP temporarily (in DB)
    user.resetOtp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000; // valid 5 min
    await user.save();

    // Send OTP via WhatsApp
    await client.messages.create({
      from: whatsappFrom,
      to: `whatsapp:+91${mobile}`,
      body: `Your OTP for password reset is: ${otp}`,
    });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =============================
// VERIFY OTP
// =============================
router.post("/verify-otp", async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    const user = await User.findOne({ mobile });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.resetOtp !== otp || Date.now() > user.otpExpiry) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.json({ message: "OTP verified. Proceed to reset password." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =============================
// RESET PASSWORD
// =============================
router.post("/reset-password", async (req, res) => {
  try {
    const { mobile, newPassword } = req.body;

    const user = await User.findOne({ mobile });
    if (!user) return res.status(400).json({ message: "User not found" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // clear otp
    user.resetOtp = undefined;
    user.otpExpiry = undefined;

    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add Member (Admin Only)
router.post("/add-member", protect, adminOnly, async (req, res) => {
  try {
    const { name, email, mobile, department, designation, role, password } =
      req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Member already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const member = new User({
      name,
      email,
      mobile,
      department,
      designation,
      role,
      password: hashedPassword,
    });

    await member.save();
    res.status(201).json({ message: "Member added successfully", member });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Fetch All Members (Admin Only)
router.get("/members", protect, adminOnly, async (req, res) => {
  try {
    const members = await User.find().select("-password");
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete Member (Admin Only)
router.delete("/members/:id", protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Member deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Edit Member (Admin Only)
router.put("/members/:id", protect, adminOnly, async (req, res) => {
  try {
    const { name, email, mobile, department, designation, role } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, mobile, department, designation, role },
      { new: true }
    );
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Member Status (Admin Only)
router.put("/members/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "Member not found" });
    }

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// =============================
// FETCH LOGIN LOGS (Admin Only)
// =============================
router.get("/logs", protect, adminOnly, async (req, res) => {
  try {
    const logs = await Log.find().sort({ loginTime: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
export default router;
