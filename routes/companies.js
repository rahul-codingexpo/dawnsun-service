import express from "express";
import Company from "../models/Company.js";
import Item from "../models/Item.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

// Get all companies
router.get("/", async (req, res) => {
  try {
    const companies = await Company.find();
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new company
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Company name required" });

    const existing = await Company.findOne({ name });
    if (existing)
      return res.status(400).json({ error: "Company already exists" });

    const company = new Company({ name });
    await company.save();
    res.status(201).json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// routes/companies.js (add this route if you want a direct company listing)

router.get("/:companyId/root", protect, async (req, res) => {
  const { companyId } = req.params;
  const items = await Item.find({ companyId, parentId: null }).sort({
    type: 1,
    name: 1,
  });
  res.json(items);
});

export default router;
