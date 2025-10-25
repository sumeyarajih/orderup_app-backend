import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import axios from "axios";

export async function POST(req) {
  try {
    const { fullName, email, password, phoneNumber } = await req.json();

    // Check if user already exists with email OR phone number
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { phoneNumber: phoneNumber }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
      }
      if (existingUser.phoneNumber === phoneNumber) {
        return NextResponse.json({ error: "User with this phone number already exists" }, { status: 400 });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Send OTP via AfroMessage API FIRST
    const response = await axios.get("https://api.afromessage.com/api/challenge", {
      params: {
        from: process.env.AFROMESSAGE_SENDER_ID,
        to: phoneNumber,
        message: `Your OrderUp verification code is {code}`, // Use placeholder
        len: "6",
        t: "0",
        ttl: "300",
      },
      headers: {
        Authorization: `Bearer ${process.env.AFROMESSAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    console.log("AfroMessage response:", response.data);

    // Use the OTP that AfroMessage generated
    const afroMessageOtp = response.data.response.code;
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    console.log("AfroMessage OTP:", afroMessageOtp);

    // Save user with AfroMessage's OTP
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        phoneNumber,
        otp: afroMessageOtp, // Use the OTP from AfroMessage
        otpExpiresAt,
      },
    });

    console.log("Saved OTP in DB:", afroMessageOtp);

    return NextResponse.json({
      message: "OTP sent successfully via AfroMessage",
      verificationId: response.data.response.verificationId, // Important for verification
      // Remove in production:
      debug: { afroMessageOtp: afroMessageOtp }
    });
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
    return NextResponse.json(
      { error: "Server error while sending OTP" },
      { status: 500 }
    );
  }
}
