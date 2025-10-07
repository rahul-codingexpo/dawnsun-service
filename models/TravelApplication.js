// models/TravelApplication.js
import mongoose from "mongoose";

const travelApplicationSchema = new mongoose.Schema({
  name: String,
  city: String,
  email: String,
  contact: String,
  department: String,
  designation: String,
  arrivalDate: Date,
  departureDate: Date,
  preference: String,
  clientName: String,
  reportingManager: String,
  otherInfo: String,
  status: { type: String, default: "In Process" },
});

export default mongoose.model("TravelApplication", travelApplicationSchema);
