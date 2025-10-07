import express from "express";
import TravelApplication from "../models/TravelApplication.js";
import {
  sendTravelWhatsApp,
  sendTravelProcessedWhatsApp,
  sendTravelApprovedWhatsApp,
} from "../utils/sendWhatsApp.js";

const router = express.Router();

// Create new travel application
router.post("/", async (req, res) => {
  try {
    const newApplication = new TravelApplication(req.body);
    await newApplication.save();

    // ✅ Send WhatsApp after successful save
    if (
      newApplication.contact &&
      newApplication.clientName &&
      newApplication.arrivalDate &&
      newApplication.departureDate
    ) {
      // 1. Pehla message: Applied successfully
      await sendTravelWhatsApp({
        mobile: newApplication.contact,
        clientName: newApplication.clientName,
        arrivalDate: newApplication.arrivalDate,
        departureDate: newApplication.departureDate,
      });

      // 2. Dusra message: Processed (2 min delay)
      setTimeout(() => {
        sendTravelProcessedWhatsApp({
          mobile: newApplication.contact,
          clientName: newApplication.clientName,
          arrivalDate: newApplication.arrivalDate,
          departureDate: newApplication.departureDate,
          processedDate: new Date().toLocaleDateString(), // current date as processed date
        });
      }, 120000);
    }

    res.status(201).json(newApplication);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all travel applications
router.get("/", async (req, res) => {
  try {
    const applications = await TravelApplication.find();
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Update status
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const travel = await TravelApplication.findById(req.params.id);

    if (!travel) {
      return res.status(404).json({ message: "Travel request not found" });
    }

    travel.status = status;
    await travel.save();

    if (status === "Approve") {
      await sendTravelApprovedWhatsApp({
        mobile: travel.contact,
        clientName: travel.name,
        departureDate: travel.fromDate,
        arrivalDate: travel.toDate,
      });
    }
    if (status === "Decline") {
      await sendTravelDeclinedWhatsApp({
        mobile: travel.contact,
        clientName: travel.clientName,
        departureDate: travel.departureDate,
        arrivalDate: travel.arrivalDate,
      });
    }

    res.json(travel);
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
