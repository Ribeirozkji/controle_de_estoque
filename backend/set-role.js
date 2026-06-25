import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [, , uid, role] = process.argv;
const allowedRoles = ["admin", "staff", "kitchen", "customer"];

if (!uid || !allowedRoles.includes(role)) {
  console.error("Uso: npm run set-role -- <uid> <admin|staff|kitchen|customer>");
  process.exit(1);
}

initializeFirebase();

await admin.auth().setCustomUserClaims(uid, { role });
console.log(`Role ${role} aplicada ao usuario ${uid}.`);

function initializeFirebase() {
  if (admin.apps.length) return;

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const localServiceAccount = path.resolve(currentDir, "..", "service-account.json");

  if (fs.existsSync(localServiceAccount)) {
    const serviceAccount = JSON.parse(fs.readFileSync(localServiceAccount, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return;
  }

  admin.initializeApp();
}
