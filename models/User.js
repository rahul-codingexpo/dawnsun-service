import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Full Name
    email: { type: String, required: true, unique: true },
    mobile: { type: String }, // optional
    status: { type: String, enum: ["Active", "Inactive"], default: "Inactive" },
    department: { type: String }, // e.g. IT, HR, Sales
    designation: { type: String }, // e.g. Manager, BD
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    role: {
      type: String,
      enum: ["Admin", "User"],
      default: "User",
    },
    password: { type: String, required: true },
    resetOtp: { type: String },
    otpExpiry: { type: Date },
  },

  { timestamps: true }
);

export default mongoose.model("User", userSchema);
