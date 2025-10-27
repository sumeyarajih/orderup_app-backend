import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    const { phoneNumber, otp } = await req.json();

    // Validate input
    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: "Phone number and OTP are required" },
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

    // Check if OTP matches and is not expired
    if (user.otp !== otp) {
      return NextResponse.json(
        { error: "Invalid OTP" }, 
        { status: 400 }
      );
    }

    if (new Date() > user.otpExpiresAt) {
      return NextResponse.json(
        { error: "OTP has expired" }, 
        { status: 400 }
      );
    }

    // Clear OTP after successful verification - WITHOUT isVerified field
    await prisma.user.update({
      where: { phoneNumber },
      data: { 
        otp: null, 
        otpExpiresAt: null,
        // Remove isVerified until you update your schema
        // isVerified: true
      },
    });

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7d" }
    );

    return NextResponse.json({ 
      message: "OTP verified successfully", 
      token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.fullName,
        email: user.email
      }
    });

  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}