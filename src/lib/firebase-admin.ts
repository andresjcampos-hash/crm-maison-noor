import admin from "firebase-admin";
import path from "path";
import fs from "fs";

const serviceAccountPath = path.join(
  process.cwd(),
  "secrets",
  "firebase-admin.json"
);

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const adminDb = admin.firestore();
