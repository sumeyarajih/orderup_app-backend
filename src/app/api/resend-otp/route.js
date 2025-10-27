import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Function to generate random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req) {
  try {
    const { phoneNumber } = await req.json();

    // Validate input
    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Find user by phone number
    const user = await prisma.user.findUnique({ 
      where: { phoneNumber } 
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" }, 
        { status: 404 }
      );
    }

    // Generate new OTP and set expiration (10 minutes from now)
    const newOtp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with new OTP
    await prisma.user.update({
      where: { phoneNumber },
      data: { 
        otp: newOtp,
        otpExpiresAt: otpExpiresAt
      },
    });

    // TODO: Integrate with your SMS service provider (Twilio, etc.)
    console.log(`OTP for ${phoneNumber}: ${newOtp}`);
    
    // In a real application, you would send the OTP via SMS here
    // Example with Twilio:
    /*
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    await client.messages.create({
      body: `Your verification code is: ${newOtp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    */

    return NextResponse.json({ 
      message: "OTP resent successfully",
      // Don't send OTP in production, this is just for testing
      otp: newOtp // Remove this in production
    });

  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}