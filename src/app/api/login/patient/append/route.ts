import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI environment variable is not defined");
}

const client = new MongoClient(uri);
const dbName = "shannonsite";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { patientName, dob, newEntries } = body ?? {};

    if (typeof patientName !== "string" || !patientName.trim()) {
      return NextResponse.json(
        { message: "Invalid patient name" },
        { status: 400 }
      );
    }

    if (!Array.isArray(newEntries)) {
      return NextResponse.json(
        { message: "Invalid entries format" },
        { status: 400 }
      );
    }

    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("data");

    const updateOp: any = {
      $push: { entries: { $each: newEntries } },
    };

    if (typeof dob === "string") {
      updateOp.$set = { dob }; // Still allows updating DOB if passed
    }

    const result = await collection.updateOne({ patientName }, updateOp);

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Patient not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Data appended successfully" });
  } catch (err: any) {
    console.error("Append route error:", err.message);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}
