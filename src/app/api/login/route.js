import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function POST(req) {
  const { email, password } = await req.json();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

  return NextResponse.json({ message: "Login successful", token });
}
