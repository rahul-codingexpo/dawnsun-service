import express from "express";
import AccessRequest from "../models/AccessRequest.js";
import Item from "../models/Item.js";
import { sendWhatsAppMessage } from "../services/whatsappService.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Recursively get all children (files & folders)
async function getAllChildren(folderId) {
  const children = await Item.find({ parentId: folderId });
  let all = [];
  for (let child of children) {
    all.push(child);
    if (child.type === "folder") {
      const nested = await getAllChildren(child._id);
      all.push(...nested);
    }
  }
  return all;
}

// Request access
router.post("/", protect, async (req, res) => {
  try {
    const { itemId, itemType } = req.body;

    const existing = await AccessRequest.findOne({
      user: req.user._id,
      item: itemId,
    });
    if (existing)
      return res.status(400).json({ message: "Request already exists" });

    const request = await AccessRequest.create({
      user: req.user._id,
      item: itemId,
      itemType,
      status: "pending",
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Check if user has access
router.get("/check/:itemId", protect, async (req, res) => {
  try {
    const request = await AccessRequest.findOne({
      user: req.user._id,
      item: req.params.itemId,
      status: "approved",
    });

    res.json({ hasAccess: !!request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all requests (Admin only)
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const requests = await AccessRequest.find()
      .populate("user", "name email department")
      .populate("item", "name type");

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Approve/Deny access
// Approve/Deny access
// router.patch("/:id", protect, adminOnly, async (req, res) => {
//   try {
//     const { status } = req.body;

//     const request = await AccessRequest.findById(req.params.id).populate(
//       "item"
//     );
//     if (!request) return res.status(404).json({ message: "Request not found" });

//     // Skip if already has same status
//     if (request.status === status) return res.json(request);

//     request.status = status;
//     await request.save();

//     // ✅ If approved → update Item.allowedUsers
//     if (status === "approved") {
//       await Item.findByIdAndUpdate(
//         request.item._id,
//         { $addToSet: { allowedUsers: request.user._id } }, // add user only once
//         { new: true }
//       );
//     } else if (status === "denied") {
//       await Item.findByIdAndUpdate(
//         request.item._id,
//         { $pull: { allowedUsers: request.user._id } }, // remove if denied
//         { new: true }
//       );
//     }

//     // ✅ If folder approved → approve all children recursively
//     if (status === "approved" && request.itemType === "folder") {
//       const children = await getAllChildren(request.item._id);

//       for (let child of children) {
//         await AccessRequest.updateOne(
//           { user: request.user._id, item: child._id },
//           { $set: { status: "approved", itemType: child.type } },
//           { upsert: true }
//         );

//         // also update allowedUsers on children
//         await Item.findByIdAndUpdate(
//           child._id,
//           { $addToSet: { allowedUsers: request.user._id } },
//           { new: true }
//         );
//       }
//     }

//     res.json(request);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// Approve/Deny access
router.patch("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;

    const request = await AccessRequest.findById(req.params.id)
      .populate("item")
      .populate("user", "name email mobile"); // ✅ need phone

    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.status === status) return res.json(request);

    request.status = status;
    await request.save();

    if (status === "approved") {
      await Item.findByIdAndUpdate(
        request.item._id,
        { $addToSet: { allowedUsers: request.user._id } },
        { new: true }
      );

      if (request.user.mobile) {
        await sendWhatsAppMessage(
          request.user.mobile,
          `✅ Hi ${request.user.name}, your request has been approved!\nYou can now access "${request.item.name}" (${request.item.type}).`
        );
      }
    } else if (status === "denied") {
      await Item.findByIdAndUpdate(
        request.item._id,
        { $pull: { allowedUsers: request.user._id } },
        { new: true }
      );

      if (request.user.mobile) {
        await sendWhatsAppMessage(
          request.user.mobile,
          `❌ Hi ${request.user.name}, your request for "${request.item.name}" was denied by the admin.`
        );
      }
    }

    // Recursive approval for folders remains the same...
    if (status === "approved" && request.itemType === "folder") {
      const children = await getAllChildren(request.item._id);
      for (let child of children) {
        await AccessRequest.updateOne(
          { user: request.user._id, item: child._id },
          { $set: { status: "approved", itemType: child.type } },
          { upsert: true }
        );
        await Item.findByIdAndUpdate(
          child._id,
          { $addToSet: { allowedUsers: request.user._id } },
          { new: true }
        );
      }
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
