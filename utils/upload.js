// import multer from "multer";
// import path from "path";
// import fs from "fs";

// /**
//  * Multer storage engine to preserve folder structure (relativePath).
//  * Each file is stored in /uploads/<companyId>/<subfolders>/filename
//  */
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     try {
//       const companyId = req.body.companyId;
//       if (!companyId) {
//         return cb(new Error("companyId is required in form-data"), null);
//       }

//       // Parse relativePaths from request (sent as JSON array)
//       let relativePaths = [];
//       if (req.body.relativePaths) {
//         try {
//           relativePaths = JSON.parse(req.body.relativePaths);
//         } catch {
//           relativePaths = [];
//         }
//       }

//       const index = (req._fileIndex = req._fileIndex || 0);
//       const relPath = relativePaths[index] || file.originalname;

//       // Extract folders (exclude filename)
//       const folders = relPath.split("/").slice(0, -1);
//       const folderPath = path.join("uploads", companyId.toString(), ...folders);

//       const absPath = path.join(process.cwd(), folderPath);
//       if (!fs.existsSync(absPath)) {
//         fs.mkdirSync(absPath, { recursive: true });
//       }

//       req._fileIndex++;
//       cb(null, absPath);
//     } catch (err) {
//       cb(err, null);
//     }
//   },
//   filename: (req, file, cb) => {
//     cb(null, file.originalname);
//   },
// });

// const upload = multer({ storage });

// export default upload;

/*updated code*/
import multer from "multer";
import path from "path";
import fs from "fs";
import Item from "../models/Item.js"; // use Item model instead of Folder

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const { companyId, parentId } = req.body;
      let folderPath;

      if (parentId) {
        // Parent folder DB se fetch
        const parentFolder = await Item.findById(parentId);
        if (!parentFolder) {
          return cb(new Error("Invalid parentId provided"), null);
        }
        // parent folder ke url/path use karo
        folderPath = path.join(process.cwd(), "uploads", parentFolder.url);
      } else if (companyId) {
        // Root upload: sirf companyId ke andar
        folderPath = path.join(process.cwd(), "uploads", companyId.toString());
      } else {
        return cb(new Error("Either companyId or parentId is required"), null);
      }

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      cb(null, folderPath);
    } catch (err) {
      cb(err, null);
    }
  },

  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });
export default upload;
