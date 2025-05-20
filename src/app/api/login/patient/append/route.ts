import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import crypto from "crypto";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);
const dbName = "shannonsite";

// Defensive hashing utility
function hashString(input: unknown): string {
  if (typeof input !== "string" || !input.trim()) {
    console.error("❌ hashString received invalid input:", input);
    throw new Error("hashString: input must be a non-empty string");
  }
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { patientName, dob, newEntries } = body ?? {};

    if (typeof patientName !== "string" || !Array.isArray(newEntries)) {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }

    const hashedName = hashString(patientName);
    const hashedDob = dob ? hashString(dob) : "";

    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("data");

    const updateOp: any = {
      $push: { entries: { $each: newEntries } },
    };

    if (dob) {
      updateOp.$set = { dob: hashedDob };
    }

    const result = await collection.updateOne(
      { patientName: hashedName },
      updateOp
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Patient not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Data appended successfully" });
  } catch (err: any) {
    console.error("🔥 Append route error:", err.message);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
