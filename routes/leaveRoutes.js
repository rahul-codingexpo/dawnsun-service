// import express from "express";
// import Leave from "../models/Leave.js";
// import { protect, adminOnly } from "../middleware/authMiddleware.js";
// import { sendLeaveAppliedWhatsApp } from "../utils/sendWhatsApp.js";

// const router = express.Router();

// router.post("/", async (req, res) => {
//   try {
//     const newLeave = new Leave(req.body);
//     await newLeave.save();

//     // ✅ WhatsApp message trigger
//     if (
//       newLeave.contact &&
//       newLeave.name &&
//       newLeave.fromDate &&
//       newLeave.toDate
//     ) {
//       await sendLeaveAppliedWhatsApp({
//         mobile: newLeave.contact,
//         clientName: newLeave.name,
//         fromDate: newLeave.fromDate,
//         toDate: newLeave.toDate,
//       });
//     }

//     res.status(201).json(newLeave);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Get all leaves (admin only)
// router.get("/", protect, adminOnly, async (req, res) => {
//   try {
//     const leaves = await Leave.find().sort({ createdAt: -1 });
//     res.json(leaves);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Update status (Approve/Deny)
// router.put("/:id", protect, adminOnly, async (req, res) => {
//   try {
//     const { status } = req.body;
//     const leave = await Leave.findByIdAndUpdate(
//       req.params.id,
//       { status },
//       { new: true }
//     );
//     res.json(leave);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// export default router;

import express from "express";
import Leave from "../models/Leave.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  sendLeaveAppliedWhatsApp,
  sendLeaveProcessedWhatsApp,
  sendLeaveApprovedWhatsApp,
  sendLeaveDeclinedWhatsApp,
} from "../utils/sendWhatsApp.js";

const router = express.Router();

// 📌 Apply new leave
router.post("/", async (req, res) => {
  try {
    const newLeave = new Leave(req.body);
    await newLeave.save();

    // ✅ Leave Applied WhatsApp
    if (
      newLeave.contact &&
      newLeave.name &&
      newLeave.fromDate &&
      newLeave.toDate
    ) {
      await sendLeaveAppliedWhatsApp({
        mobile: newLeave.contact,
        clientName: newLeave.name,
        fromDate: newLeave.fromDate,
        toDate: newLeave.toDate,
      });

      // ✅ 2 minutes baad "Leave Processed" message bhejna
      setTimeout(async () => {
        await sendLeaveProcessedWhatsApp({
          mobile: newLeave.contact,
          clientName: newLeave.name,
          fromDate: newLeave.fromDate,
          toDate: newLeave.toDate,
          processedDate: new Date(),
        });
      }, 2 * 60 * 1000); // 2 minutes in milliseconds
    }

    res.status(201).json(newLeave);
  } catch (err) {
    console.error("❌ Error creating leave:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 📌 Get all leaves (Admin only)
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const leaves = await Leave.find().sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    console.error("❌ Error fetching leaves:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 📌 Update status (Approve / Decline)
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!leave) {
      return res.status(404).json({ error: "Leave not found" });
    }

    // ✅ Status based WhatsApp
    if (leave.contact && leave.name) {
      if (status === "Approved") {
        await sendLeaveApprovedWhatsApp({
          mobile: leave.contact,
          clientName: leave.name,
          fromDate: leave.fromDate,
          toDate: leave.toDate,
        });
      } else if (status === "Declined") {
        await sendLeaveDeclinedWhatsApp({
          mobile: leave.contact,
          clientName: leave.name,
          fromDate: leave.fromDate,
          toDate: leave.toDate,
        });
      }
    }

    res.json(leave);
  } catch (err) {
    console.error("❌ Error updating leave:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
