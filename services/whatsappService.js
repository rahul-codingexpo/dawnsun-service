import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendWhatsAppMessage(to, message) {
  try {
    const res = await client.messages.create({
      from: "whatsapp:" + process.env.TWILIO_WHATSAPP_NUMBER,
      to: "whatsapp:" + to,
      body: message,
    });
    console.log("WhatsApp sent:", res.sid);
  } catch (err) {
    console.error("WhatsApp error:", err.message);
  }
}
