import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);
const dbName = "shannonsite";

export async function POST(req: NextRequest) {
  const { patientName, dob, newEntries } = await req.json();

  if (!patientName || !Array.isArray(newEntries)) {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 }
    );
  }

  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection("data");

  const updateOp: any = {
    $set: {
      entries: newEntries,
    },
  };

  if (dob) {
    updateOp.$set.dob = dob;
  }

  const result = await collection.updateOne({ patientName }, updateOp);

  if (result.matchedCount === 0) {
    return NextResponse.json({ message: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Entries replaced successfully" });
}
