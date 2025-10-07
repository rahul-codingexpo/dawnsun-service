import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    contact: String,
    department: String,
    designation: String,
    fromDate: Date,
    toDate: Date,
    hod: String,
    status: { type: String, default: "Pending" }, // Pending by default
  },
  { timestamps: true }
);

export default mongoose.model("Leave", leaveSchema);
