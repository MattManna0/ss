import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);
const dbName = "shannonsite";

export async function POST(req: NextRequest) {
  const { patientName, dob } = await req.json();

  if (!patientName || !dob) {
    return NextResponse.json(
      { message: "Missing name or DOB" },
      { status: 400 }
    );
  }

  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection("data");

  let patient = await collection.findOne({ patientName, dob });

  if (!patient) {
    // Create a new empty record
    const insertResult = await collection.insertOne({
      patientName,
      dob,
      entries: [],
    });
    patient = { patientName, dob, entries: [], _id: insertResult.insertedId };
  }

  return NextResponse.json({ entries: patient.entries });
}
