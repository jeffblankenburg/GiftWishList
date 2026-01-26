import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !verifyServiceSid) {
  console.warn(
    "Twilio credentials not configured. SMS features will not work."
  );
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export { twilioPhoneNumber };

export async function sendVerificationCode(phoneNumber: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!client || !verifyServiceSid) {
    return { success: false, error: "SMS service not configured" };
  }

  try {
    await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: phoneNumber, channel: "sms" });

    return { success: true };
  } catch (error) {
    console.error("Failed to send verification code:", error);
    return {
      success: false,
      error: "Failed to send verification code. Please try again.",
    };
  }
}

export async function checkVerificationCode(
  phoneNumber: string,
  code: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!client || !verifyServiceSid) {
    return { success: false, error: "SMS service not configured" };
  }

  try {
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phoneNumber, code });

    if (verification.status === "approved") {
      return { success: true };
    } else {
      return { success: false, error: "Invalid or expired code" };
    }
  } catch (error) {
    console.error("Failed to verify code:", error);
    return { success: false, error: "Invalid or expired code" };
  }
}

export async function sendSms(
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`sendSms called: to=${to}, body=${body.substring(0, 50)}...`);

  if (!client || !twilioPhoneNumber) {
    console.error("SMS service not configured - client:", !!client, "phone:", !!twilioPhoneNumber);
    return { success: false, error: "SMS service not configured" };
  }

  try {
    console.log(`Sending SMS from ${twilioPhoneNumber} to ${to}`);
    const message = await client.messages.create({
      to,
      from: twilioPhoneNumber,
      body,
    });
    console.log(`SMS sent successfully: ${message.sid}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to send SMS:", error);
    return { success: false, error: "Failed to send SMS" };
  }
}

// Validate that a request came from Twilio
export function validateTwilioRequest(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  return twilio.validateRequest(authToken, signature, url, params);
}
