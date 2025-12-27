// src/lib/firebaseClient.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 🚨 Validação importante — se faltar algo, já avisa no console:
if (!firebaseConfig.apiKey) {
  console.error("❌ ERRO: NEXT_PUBLIC_FIREBASE_API_KEY não carregou do .env.local");
}
if (!firebaseConfig.authDomain) {
  console.error("❌ ERRO: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN não carregou do .env.local");
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
