import express from "express";
import Item from "../models/Item.js";
import AccessRequest from "../models/AccessRequest.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import upload from "../utils/upload.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

const router = express.Router();

/** ============ UTILITY: ENSURE FOLDER PATH ============ */
async function ensurePath({
  companyId,
  pathParts,
  createdBy,
  parentId = null,
  department = "all",
}) {
  let folderPath;

  if (parentId) {
    const parent = await Item.findById(parentId);
    if (!parent || parent.type !== "folder")
      throw new Error("Invalid parent folder");
    folderPath = parent.url;
  } else {
    folderPath = path.join("uploads", companyId.toString());
    if (!fs.existsSync(folderPath))
      fs.mkdirSync(folderPath, { recursive: true });
    parentId = null;
  }

  for (const part of pathParts) {
    let existing = await Item.findOne({
      type: "folder",
      name: part,
      parentId,
      companyId,
    });
    if (!existing) {
      folderPath = path.join(folderPath, part);
      const absPath = path.join(process.cwd(), folderPath);
      if (!fs.existsSync(absPath)) fs.mkdirSync(absPath, { recursive: true });
      existing = await Item.create({
        name: part,
        type: "folder",
        parentId,
        companyId,
        url: folderPath,
        createdBy,
        department,
      });
    } else {
      folderPath = existing.url;
    }
    parentId = existing._id;
  }

  return { parentId, folderPath };
}

// async function canUserSee(user, item) {
//   if (!item) return false;
//   if (item.expiryDate && new Date() > item.expiryDate) return false;
//   if (user.role === "Admin") return true;

//   // ✅ Department based check
//   if (item.department === "none") return false;
//   if (
//     item.department === "all" ||
//     item.department === user.department?.toLowerCase()
//   ) {
//     return true;
//   }

//   // ✅ Access approved manually
//   const approved = await AccessRequest.findOne({
//     user: user._id,
//     item: item._id,
//     status: "approved",
//   });

//   if (approved) return true;

//   return false;
// }
async function canUserSee(user, item) {
  if (!item) return false;

  // 1️⃣ Expired items are inaccessible
  if (item.expiryDate && new Date() > item.expiryDate) return false;

  // 2️⃣ Admin can see everything
  if (user.role === "Admin") return true;

  // 3️⃣ If item is restricted, check allowedUsers
  if (item.isRestricted && Array.isArray(item.allowedUsers)) {
    const allowedIds = item.allowedUsers.map((id) => id.toString());
    if (allowedIds.includes(user._id.toString())) return true;
  }

  // 4️⃣ Department-based access
  if (item.department === "all") return true; // everyone in company
  if (item.department && item.department !== "none") {
    if (item.department.toLowerCase() === user.department?.toLowerCase())
      return true;
  }

  // 5️⃣ Check manual AccessRequest approval
  const approved = await AccessRequest.findOne({
    user: user._id,
    item: item._id,
    status: "approved",
  });
  if (approved) return true;

  // 6️⃣ Default: no access
  return false;
}

/** ============ GET ALL ITEMS ============ */
// router.get("/", protect, async (req, res) => {
//   try {
//     const { parentId, companyId, type } = req.query;
//     const query = {};

//     if (companyId) query.companyId = new mongoose.Types.ObjectId(companyId);
//     query.parentId =
//       parentId === "null" || !parentId
//         ? null
//         : new mongoose.Types.ObjectId(parentId);
//     if (type) query.type = type;

//     const items = await Item.find(query).sort({ type: 1, name: 1 });
//     const filtered = [];
//     for (const item of items) {
//       if (await canUserSee(req.user, item)) {
//         const obj = item.toObject();
//         if (obj.url) obj.url = `/uploads/${obj.url}`;
//         filtered.push(obj);
//       }
//     }

//     res.json(filtered);
//   } catch (err) {
//     console.error("Error fetching items:", err);
//     res.status(500).json({ message: err.message });
//   }
// });

/*2nd update*/

// router.get("/", protect, async (req, res) => {
//   try {
//     const { parentId, companyId, type } = req.query;
//     const user = req.user;

//     const query = {};
//     if (companyId) query.companyId = new mongoose.Types.ObjectId(companyId);
//     query.parentId =
//       parentId === "null" || !parentId
//         ? null
//         : new mongoose.Types.ObjectId(parentId);
//     if (type) query.type = type;

//     // ✅ Admin ko sab milega
//     if (user.role !== "Admin") {
//       query.$or = [
//         { department: "all" },
//         { department: user.department },
//         { department: { $exists: false } },
//       ];
//     }

//     const items = await Item.find(query).sort({ type: 1, name: 1 });
//     const filtered = [];

//     for (const item of items) {
//       if (await canUserSee(user, item)) {
//         const obj = item.toObject();
//         if (obj.url) obj.url = `/uploads/${obj.url}`;
//         filtered.push(obj);
//       }
//     }

//     res.json(filtered);
//   } catch (err) {
//     console.error("Error fetching items:", err);
//     res.status(500).json({ message: err.message });
//   }
// });

// ✅ Show all items to everyone (no department filtering)
router.get("/", protect, async (req, res) => {
  try {
    const { parentId, companyId, type } = req.query;

    const query = {};
    if (companyId) query.companyId = new mongoose.Types.ObjectId(companyId);
    query.parentId =
      parentId === "null" || !parentId
        ? null
        : new mongoose.Types.ObjectId(parentId);
    if (type) query.type = type;

    // Get all items without department filtering
    const items = await Item.find(query).sort({ type: 1, name: 1 });

    const mapped = items.map((item) => {
      const obj = item.toObject();
      if (obj.url) obj.url = `/uploads/${obj.url}`;
      return obj;
    });

    res.json(mapped);
  } catch (err) {
    console.error("Error fetching items:", err);
    res.status(500).json({ message: err.message });
  }
});

/** ============ GET SINGLE ITEM ============ */
router.get("/:id", protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (!(await canUserSee(req.user, item)))
      return res.status(403).json({ message: "Access denied" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** ============ OPEN ITEM ============ */
// router.get("/:id/open", protect, async (req, res) => {
//   try {
//     const item = await Item.findById(req.params.id);
//     if (!item) return res.status(404).json({ message: "Item not found" });

//     if (await canUserSee(req.user, item)) {
//       res.json({ allowed: true, item });
//     } else {
//       res.status(403).json({
//         allowed: false,
//         message: "Access denied. Please request access.",
//       });
//     }
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

router.get("/:id/open", protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (await canUserSee(req.user, item)) {
      return res.json({ allowed: true, item });
    } else {
      return res.status(403).json({
        allowed: false,
        message: "Access denied. You can request access.",
        canRequest: true,
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** ============ CREATE FOLDER ============ */
router.post("/folder", protect, adminOnly, async (req, res) => {
  try {
    const {
      name,
      parentId = null,
      companyId,
      expiryDate,
      isRestricted,
      allowedUsers,
      department,
    } = req.body;
    if (!name) return res.status(400).json({ message: "Folder name required" });
    if (!companyId && !parentId)
      return res
        .status(400)
        .json({ message: "companyId or parentId required" });

    const parent = parentId ? await Item.findById(parentId) : null;
    if (parentId && (!parent || parent.type !== "folder"))
      return res.status(400).json({ message: "Invalid parent folder" });

    const folderPath = parent
      ? parent.url.replace(/^uploads[\\/]/, "")
      : companyId.toString();
    const absPath = path.join(process.cwd(), "uploads", folderPath, name);
    if (!fs.existsSync(absPath)) fs.mkdirSync(absPath, { recursive: true });

    const folder = await Item.create({
      name,
      type: "folder",
      parentId: parentId ? new mongoose.Types.ObjectId(parentId) : null,
      companyId: parent
        ? parent.companyId
        : new mongoose.Types.ObjectId(companyId),
      url: path.join(folderPath, name).split(path.sep).join("/"),
      expiryDate: expiryDate || null,
      isRestricted: !!isRestricted,
      allowedUsers: Array.isArray(allowedUsers) ? allowedUsers : [],
      department: department || "all",
      createdBy: req.user._id,
    });

    res
      .status(201)
      .json({ ...folder.toObject(), url: `/uploads/${folder.url}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

/** ============ UPLOAD FILES ============ */
router.post(
  "/upload",
  protect,
  adminOnly,
  upload.array("files", 1000),
  async (req, res) => {
    try {
      const {
        parentId = null,
        companyId,
        expiryDate,
        isRestricted,
        allowedUsers,
        department,
      } = req.body;
      const files = req.files || [];
      if (!files.length)
        return res.status(400).json({ message: "No files uploaded" });

      let baseCompanyId = companyId
        ? new mongoose.Types.ObjectId(companyId)
        : null;
      let baseParentId = parentId
        ? new mongoose.Types.ObjectId(parentId)
        : null;
      let basePath;

      if (baseParentId) {
        const parent = await Item.findById(baseParentId);
        if (!parent || parent.type !== "folder")
          return res.status(400).json({ message: "Invalid parent folder" });
        baseCompanyId = parent.companyId;
        basePath = parent.url.replace(/^uploads[\\/]/, "");
      } else {
        if (!baseCompanyId)
          return res
            .status(400)
            .json({ message: "companyId or parentId required" });
        basePath = baseCompanyId.toString();
      }

      let relativePaths = [];
      if (req.body.relativePaths) {
        try {
          relativePaths = JSON.parse(req.body.relativePaths);
        } catch {}
      }

      const created = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const relPath = relativePaths[i] || f.originalname;
        const parts = relPath.split("/").filter(Boolean);
        const fileName = parts.pop();
        let effectiveParentId = baseParentId;
        let effectivePath = basePath;

        if (parts.length > 0) {
          const { parentId: finalParentId, folderPath: finalPath } =
            await ensurePath({
              companyId: baseCompanyId,
              pathParts: parts,
              createdBy: req.user._id,
              parentId: effectiveParentId,
              department,
            });
          effectiveParentId = finalParentId;
          effectivePath = finalPath.replace(/^uploads[\\/]/, "");
        }

        const absDir = path.join(process.cwd(), "uploads", effectivePath);
        if (!fs.existsSync(absDir)) fs.mkdirSync(absDir, { recursive: true });

        const absFilePath = path.join(absDir, fileName);
        fs.renameSync(f.path, absFilePath);

        const doc = await Item.create({
          name: fileName,
          originalName: f.originalname,
          type: "file",
          parentId: effectiveParentId,
          companyId: baseCompanyId,
          url: path.join(effectivePath, fileName).split(path.sep).join("/"),
          mimeType: f.mimetype,
          size: f.size,
          relativePath: relPath,
          expiryDate: expiryDate || null,
          isRestricted: !!isRestricted,
          allowedUsers: Array.isArray(allowedUsers) ? allowedUsers : [],
          department: department || "all",
          createdBy: req.user._id,
        });

        created.push({ ...doc.toObject(), url: `/uploads/${doc.url}` });
      }

      res
        .status(201)
        .json({ message: "Uploaded successfully", items: created });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message || "Upload failed" });
    }
  }
);

async function updateChildrenUrls(parentId, oldBaseUrl, newBaseUrl) {
  const children = await Item.find({ parentId });

  for (const child of children) {
    if (child.url.startsWith(oldBaseUrl)) {
      const childNewUrl = child.url.replace(oldBaseUrl, newBaseUrl);
      const childOldUrl = child.url; // store before updating

      child.url = childNewUrl;
      await child.save();

      if (child.type === "folder") {
        // 🔑 Pass updated URLs for deeper children
        await updateChildrenUrls(child._id, childOldUrl, childNewUrl);
      }
    }
  }
}

/** ============ UPDATE ITEM ============ */
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const {
      name,
      uploadedDate,
      expiryDate,
      isRestricted,
      allowedUsers,
      department,
    } = req.body;

    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    let oldUrl = item.url;
    let newUrl = item.url;

    if (name && name !== item.name) {
      const oldAbsPath = path.join(process.cwd(), "uploads", item.url);
      const newAbsPath = path.join(path.dirname(oldAbsPath), name);

      if (fs.existsSync(oldAbsPath)) fs.renameSync(oldAbsPath, newAbsPath);

      newUrl = path
        .join(path.dirname(item.url), name)
        .split(path.sep)
        .join("/");

      // ✅ propagate to children
      if (item.type === "folder") {
        await updateChildrenUrls(item._id, oldUrl, newUrl);
      }
    }

    item.name = name || item.name;
    item.url = newUrl;
    if (uploadedDate) item.uploadedDate = new Date(uploadedDate);
    if (expiryDate) item.expiryDate = new Date(expiryDate);
    if (typeof isRestricted !== "undefined") item.isRestricted = !!isRestricted;
    if (Array.isArray(allowedUsers)) item.allowedUsers = allowedUsers;
    if (department) item.department = department;

    const updated = await item.save();
    res.json({ ...updated.toObject(), url: `/uploads/${updated.url}` });
  } catch (err) {
    console.error("Error updating item:", err);
    res.status(500).json({ message: err.message });
  }
});

/** ============ ASSIGN ACCESS ============ */
router.put("/:id/access", protect, adminOnly, async (req, res) => {
  try {
    const { isRestricted, allowedUsers } = req.body;
    const updated = await Item.findByIdAndUpdate(
      req.params.id,
      {
        isRestricted: !!isRestricted,
        allowedUsers: Array.isArray(allowedUsers) ? allowedUsers : [],
      },
      { new: true }
    ).populate("allowedUsers", "name email");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** ============ UPDATE EXPIRY DATE ============ */
router.put("/:id/expiry", protect, adminOnly, async (req, res) => {
  try {
    const { expiryDate } = req.body;
    const updated = await Item.findByIdAndUpdate(
      req.params.id,
      { expiryDate: expiryDate || null },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** ============ DELETE ITEM ============ */
async function deleteFolderRecursive(folderId, folderPath) {
  const items = await Item.find({ parentId: folderId });
  for (const subItem of items) {
    if (subItem.type === "file" && subItem.url) {
      const filePath = path.join(
        "uploads",
        subItem.url.replace(/^\/?uploads[\\/]/, "")
      );
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } else if (subItem.type === "folder") {
      const subFolderPath = path.join(folderPath, subItem.name);
      await deleteFolderRecursive(subItem._id, subFolderPath);
    }
    await Item.findByIdAndDelete(subItem._id);
  }
  if (fs.existsSync(folderPath)) fs.rmdirSync(folderPath, { recursive: true });
}

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.type === "file" && item.url) {
      const filePath = path.join(
        "uploads",
        item.url.replace(/^\/?uploads[\\/]/, "")
      );
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    if (item.type === "folder") {
      const folderPath = path.join(
        "uploads",
        item.companyId?.toString() || "",
        item.name
      );
      await deleteFolderRecursive(item._id, folderPath);
    }

    await Item.findByIdAndDelete(item._id);
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** ============ GET FOLDER CONTENTS RECURSIVE ============ */
router.get("/folder/:id/contents", protect, async (req, res) => {
  try {
    const folder = await Item.findById(req.params.id);
    if (!folder || folder.type !== "folder")
      return res.status(404).json({ message: "Folder not found" });

    async function getFolderContents(parentId, user) {
      const children = await Item.find({ parentId });
      let results = [];
      for (const child of children) {
        if (!(await canUserSee(user, child))) continue;
        const childObj = child.toObject();
        if (childObj.url) childObj.url = `/uploads/${childObj.url}`;
        results.push(childObj);
        if (child.type === "folder") {
          const subItems = await getFolderContents(child._id, user);
          results = results.concat(subItems);
        }
      }
      return results;
    }

    const allItems = await getFolderContents(folder._id, req.user);
    res.json({
      folder: { ...folder.toObject(), url: `/uploads/${folder.url}` },
      contents: allItems,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// /** ========= Helper: Recursively update companyId ========= */
// async function updateCompanyRecursively(itemId, newCompanyId) {
//   // Update the item itself
//   await Item.findByIdAndUpdate(itemId, { companyId: newCompanyId });

//   // Fetch children of this folder
//   const children = await Item.find({ parentId: itemId });
//   for (const child of children) {
//     await updateCompanyRecursively(child._id, newCompanyId);
//   }
// }

// /** ========= ASSIGN FILE/FOLDER TO COMPANY ========= */
// // PUT /api/items/:id/assign
// router.put("/:id/assign", protect, adminOnly, async (req, res) => {
//   try {
//     const { companyId } = req.body;
//     if (!companyId) {
//       return res.status(400).json({ message: "Company ID is required" });
//     }

//     const item = await Item.findById(req.params.id);
//     if (!item) {
//       return res.status(404).json({ message: "Item not found" });
//     }

//     if (item.type === "folder") {
//       // ✅ Recursively update folder and its children
//       await updateCompanyRecursively(item._id, companyId);
//     } else {
//       // ✅ Simple file update
//       item.companyId = companyId;
//       await item.save();
//     }

//     res.json({ message: "Item assigned successfully" });
//   } catch (err) {
//     console.error("Error assigning item:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// });
// Helper: Recursively move folder/files and update URLs in DB
async function moveAndUpdateItem(item, newCompanyId, oldBasePath, newBasePath) {
  const oldPath = path.join("uploads", oldBasePath);
  const newPath = path.join("uploads", newBasePath);

  // Move on disk
  if (fs.existsSync(oldPath)) {
    fs.mkdirSync(path.dirname(newPath), { recursive: true });
    fs.renameSync(oldPath, newPath);
  }

  // Update DB
  item.companyId = newCompanyId;
  item.url = newBasePath.split(path.sep).join("/"); // store relative URL
  await item.save();

  if (item.type === "folder") {
    // Move children recursively
    const children = await Item.find({ parentId: item._id });
    for (const child of children) {
      const childOldRelative = child.url.replace(/^\/?uploads[\\/]/, "");
      const childNewRelative = path.join(
        newBasePath,
        path.basename(childOldRelative)
      );
      await moveAndUpdateItem(
        child,
        newCompanyId,
        childOldRelative,
        childNewRelative
      );
    }
  }
}

router.put("/:id/assign", protect, adminOnly, async (req, res) => {
  const { companyId } = req.body;
  const itemId = req.params.id;

  try {
    if (!companyId)
      return res.status(400).json({ message: "Company ID is required" });

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (!item.url) return res.status(400).json({ message: "Item URL not set" });

    const oldRelative = item.url.replace(/^\/?uploads[\\/]/, "");
    const newRelative = path.join(
      companyId.toString(),
      path.basename(oldRelative)
    );

    await moveAndUpdateItem(item, companyId, oldRelative, newRelative);

    res.json({ message: "Item assigned successfully", item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/** ============ SHARE WITH MULTIPLE DEPARTMENTS ============ */
router.put("/:id/share-departments", protect, adminOnly, async (req, res) => {
  try {
    const { departments } = req.body; // Expect array of department names
    if (!Array.isArray(departments) || departments.length === 0) {
      return res.status(400).json({ message: "Departments array is required" });
    }

    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    // Save as array for flexibility
    item.sharedDepartments = departments.map((d) => d.toLowerCase());
    await item.save();

    res.json({
      message: "Item shared successfully with selected departments",
      sharedDepartments: item.sharedDepartments,
    });
  } catch (err) {
    console.error("Error sharing item with departments:", err);
    res.status(500).json({ message: err.message });
  }
});
/** ============ GET UNIQUE DEPARTMENTS ============ */
router.get("/departments", protect, async (req, res) => {
  try {
    const depts = await Item.distinct("department", {
      department: { $nin: [null, "", "none"] },
    });

    res.json(depts);
  } catch (err) {
    console.error("Error fetching departments:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
