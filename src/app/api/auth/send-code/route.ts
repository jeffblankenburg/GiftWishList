import { NextRequest, NextResponse } from "next/server";
import { sendVerificationCode } from "@/lib/twilio";
import { formatPhoneNumber, isValidPhoneNumber } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    const result = await sendVerificationCode(formattedPhone);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in send-code:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
