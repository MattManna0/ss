import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);
const dbName = "shannonsite";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json(
      { message: "Missing credentials" },
      { status: 400 }
    );
  }

  await client.connect();
  const db = client.db(dbName);
  const users = db.collection("users");

  const user = await users.findOne({ username });
  if (!user) {
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 }
    );
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 }
    );
  }

  // You can add session logic here if needed
  return NextResponse.json({ message: "Login successful" });
}
