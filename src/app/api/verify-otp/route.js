import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req) {
  const { phoneNumber, otp } = await req.json();

  const user = await prisma.user.findUnique({ where: { phoneNumber } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.otp !== otp || new Date() > user.otpExpiresAt) {
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
  }

  // Clear OTP after success
  await prisma.user.update({
    where: { phoneNumber },
    data: { otp: null, otpExpiresAt: null },
  });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

  return NextResponse.json({ message: "OTP verified", token });
}
