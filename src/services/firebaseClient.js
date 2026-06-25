import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider, getToken as getAppCheckToken } from "firebase/app-check";
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || "";
const useEmulators = import.meta.env.VITE_FIREBASE_USE_EMULATORS === "true";

function isFirebaseConfigured(config) {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

export const backendReady = (async () => {
  if (!isFirebaseConfigured(firebaseConfig)) {
    return null;
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  let appCheck = null;

  if (appCheckSiteKey) {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }

  if (useEmulators) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  }

  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }

  async function getAuthUser() {
    const user = auth.currentUser;

    if (!user) {
      return null;
    }

    const token = await user.getIdTokenResult(true);
    return {
      uid: user.uid,
      email: user.email || "",
      isAnonymous: user.isAnonymous,
      role: token.claims.role || "customer",
    };
  }

  async function signInWithEmail(email, password) {
    if (auth.currentUser?.isAnonymous) {
      await firebaseSignOut(auth);
    }

    await signInWithEmailAndPassword(auth, email, password);
    return getAuthUser();
  }

  async function signOut() {
    await firebaseSignOut(auth);
    await signInAnonymously(auth);
    return getAuthUser();
  }

  async function request(path, options = {}) {
    if (!apiBaseUrl) {
      throw new Error("Configure VITE_API_BASE_URL.");
    }

    const token = await auth.currentUser.getIdToken();
    const appCheckToken = appCheck ? (await getAppCheckToken(appCheck, false)).token : "";
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Erro ao comunicar com a API.");
    }

    return data;
  }

  async function get(resource, params = {}) {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        search.set(key, value);
      }
    }

    const suffix = search.toString() ? `?${search.toString()}` : "";
    return request(`/api/${resource}${suffix}`);
  }

  async function post(resource, data, action = "") {
    const suffix = action ? `?action=${encodeURIComponent(action)}` : "";
    return request(`/api/${resource}${suffix}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  function subscribeAll(callback, onError) {
    let cancelled = false;

    async function load() {
      try {
        const [dashboard, suppliers, products, movements, commands] = await Promise.all([
          get("dashboard"),
          get("suppliers"),
          get("products"),
          get("movements"),
          get("commands"),
        ]);

        if (!cancelled) {
          callback({ dashboard, suppliers, products, movements, commands });
        }
      } catch (error) {
        if (!cancelled) {
          onError(error);
        }
      }
    }

    load();
    const timer = window.setInterval(load, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }

  return {
    get,
    post,
    subscribeAll,
    signInWithEmail,
    signOut,
    getAuthUser,
    enabled: true,
  };
})();
