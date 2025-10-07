import axios from "axios";

export const sendTravelWhatsApp = async ({
  mobile,
  clientName,
  departureDate,
  arrivalDate,
}) => {
  try {
    const templateParams = [
      // clientName ? String(clientName) : "Guest", // ensure it's string
      clientName && clientName.trim() ? String(clientName) : "Guest",
      departureDate ? new Date(departureDate).toLocaleDateString("en-IN") : "",
      arrivalDate ? new Date(arrivalDate).toLocaleDateString("en-IN") : "",
    ];

    const response = await axios.post(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: "Travel", // must match dashboard campaign name
        destination: `91${mobile}`, // with country code
        userName: "Dawnsun Exim",
        templateParams, // clean string values
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("WhatsApp sent successfully:", response.data);
    return response.data;
  } catch (err) {
    console.error("Error sending WhatsApp:", err.response?.data || err.message);
    return null;
  }
};

// ✅ Dusra message (Processed status ke liye)
export const sendTravelProcessedWhatsApp = async ({
  mobile,
  clientName,
  arrivalDate,
  departureDate,
  processedDate,
}) => {
  try {
    const response = await axios.post(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: "TravelProcessed",
        destination: `91${mobile}`,
        userName: "Dawnsun Exim",
        templateParams: [
          clientName || "Guest",
          new Date(arrivalDate).toLocaleDateString("en-IN"),
          new Date(departureDate).toLocaleDateString("en-IN"),
          new Date(processedDate).toLocaleDateString("en-IN"),
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("Processed WhatsApp sent successfully:", response.data);
    return response.data;
  } catch (err) {
    console.error(
      "Error sending Processed WhatsApp:",
      err.response?.data || err.message
    );
    return null;
  }
};

// ✅ Teesra message (Approved status ke liye)

export const sendTravelApprovedWhatsApp = async ({
  mobile,
  clientName,
  departureDate,
  arrivalDate,
}) => {
  try {
    const response = await axios.post(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: "TravelApproved", // ✅ Apna approved template name use karo
        destination: `91${mobile}`,
        userName: "Dawnsun Exim",
        templateParams: [
          clientName || "Guest",
          new Date(departureDate).toLocaleDateString("en-IN"),
          new Date(arrivalDate).toLocaleDateString("en-IN"),
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("✅ Approved WhatsApp sent:", response.data);
    return response.data;
  } catch (err) {
    console.error(
      "❌ Error sending Approved WhatsApp:",
      err.response?.data || err.message
    );
    return null;
  }
};

// ✅ Chautha message (Declined status ke liye)

export const sendTravelDeclinedWhatsApp = async ({
  mobile,
  clientName,
  fromDate,
  toDate,
}) => {
  try {
    const response = await axios.post(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: "Traveldeclined", // ✅ Template name
        destination: `91${mobile}`,
        userName: "Dawnsun Exim",
        templateParams: [
          clientName || "Guest",
          new Date(fromDate).toLocaleDateString("en-IN"),
          new Date(toDate).toLocaleDateString("en-IN"),
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("✅ Leave Declined WhatsApp sent:", response.data);
    return response.data;
  } catch (err) {
    console.error(
      "❌ Error sending Leave Declined WhatsApp:",
      err.response?.data || err.message
    );
    return null;
  }
};

// ✅ Leave Applied WhatsApp message
export const sendLeaveAppliedWhatsApp = async ({
  mobile,
  clientName,
  fromDate,
  toDate,
}) => {
  try {
    const response = await axios.post(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: "Leaveapplication", // ✅ Aapko AiSensy me banani hogi template is name se
        destination: `91${mobile}`,
        userName: "Dawnsun Exim",
        templateParams: [
          clientName && clientName.trim() ? String(clientName) : "Guest",
          new Date(fromDate).toLocaleDateString("en-IN"),
          new Date(toDate).toLocaleDateString("en-IN"),
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("✅ Leave Applied WhatsApp sent:", response.data);
    return response.data;
  } catch (err) {
    console.error(
      "❌ Error sending Leave Applied WhatsApp:",
      err.response?.data || err.message
    );
    return null;
  }
};

// ✅ Leave Processed (2 min baad auto bhejna)
export const sendLeaveProcessedWhatsApp = async ({
  mobile,
  clientName,
  fromDate,
  toDate,
  processedDate,
}) => {
  try {
    const response = await axios.post(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: "Leaveprocess", // ✅ Template name
        destination: `91${mobile}`,
        userName: "Dawnsun Exim",
        templateParams: [
          clientName || "Guest",
          new Date(fromDate).toLocaleDateString("en-IN"),
          new Date(toDate).toLocaleDateString("en-IN"),
          new Date(processedDate).toLocaleDateString("en-IN"),
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("✅ Leave Processed WhatsApp sent:", response.data);
    return response.data;
  } catch (err) {
    console.error(
      "❌ Error sending Leave Processed WhatsApp:",
      err.response?.data || err.message
    );
    return null;
  }
};

// ✅ Leave Approved
export const sendLeaveApprovedWhatsApp = async ({
  mobile,
  clientName,
  fromDate,
  toDate,
}) => {
  try {
    const response = await axios.post(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: "Leaveapproved",
        destination: `91${mobile}`,
        userName: "Dawnsun Exim",
        templateParams: [
          clientName || "Guest",
          new Date(fromDate).toLocaleDateString("en-IN"),
          new Date(toDate).toLocaleDateString("en-IN"),
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("✅ Leave Approved WhatsApp sent:", response.data);
    return response.data;
  } catch (err) {
    console.error(
      "❌ Error sending Leave Approved WhatsApp:",
      err.response?.data || err.message
    );
    return null;
  }
};

// ✅ Leave Declined
export const sendLeaveDeclinedWhatsApp = async ({
  mobile,
  clientName,
  fromDate,
  toDate,
}) => {
  try {
    const response = await axios.post(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: "Leavedeclined", // ✅ Template name
        destination: `91${mobile}`,
        userName: "Dawnsun Exim",
        templateParams: [
          clientName || "Guest",
          new Date(fromDate).toLocaleDateString("en-IN"),
          new Date(toDate).toLocaleDateString("en-IN"),
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("✅ Leave Declined WhatsApp sent:", response.data);
    return response.data;
  } catch (err) {
    console.error(
      "❌ Error sending Leave Declined WhatsApp:",
      err.response?.data || err.message
    );
    return null;
  }
};
