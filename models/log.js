import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  department: { type: String, required: true },
  ip: { type: String, required: true },
  dateTime: { type: Date, default: Date.now },
});

const Log = mongoose.model("Log", logSchema);
export default Log;
