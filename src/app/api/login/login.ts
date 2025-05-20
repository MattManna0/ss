import { getIronSession, IronSession } from "iron-session";
import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import clientPromise from "lib/mongodb"; // ✅ relative import

// ✅ Define the session data shape inline
type SessionData = {
  user?: {
    username: string;
  };
};

const sessionOptions = {
  cookieName: "auth",
  password: process.env.SESSION_SECRET!,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

export default async function loginRoute(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const { username, password } = req.body;

  const client = await clientPromise;
  const db = client.db();
  const user = await db.collection("users").findOne({ username });

  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  // ✅ Type-safe session
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  session.user = { username: user.username };
  await session.save();

  res.status(200).json({ message: "Logged in" });
}
