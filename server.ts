import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";
import Stripe from "stripe";

dotenv.config();

let stripe: Stripe | null = null;
const getStripe = () => {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is missing");
    stripe = new Stripe(key);
  }
  return stripe;
};

// Load Firebase Config to get the correct project ID and database ID
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  }
} catch (err) {
  console.error("Failed to load firebase-applet-config.json:", err);
}

// Initialize Firebase Admin
// In AI Studio, we can often rely on default credentials or just provided project ID
try {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId || "trusty-stack-476819-g5",
    });
  }
} catch (err) {
  console.error("Firebase admin initializeApp failed on start:", err);
}

let db: any;
try {
  db = firebaseConfig.firestoreDatabaseId 
    ? getFirestore(firebaseConfig.firestoreDatabaseId)
    : getFirestore();
} catch (e) {
  console.error("CRITICAL WARNING: Firestore initialization failed. Direct DB writes will be stubbed, but server will start safely:", e);
  db = {
    collection: (colName: string) => {
      console.warn(`[Firestore STUB] collection called: ${colName}`);
      return {
        doc: (docId: string) => ({
          get: async () => ({
            exists: false,
            data: () => ({})
          }),
          set: async (data: any) => { console.log(`[Firestore STUB] set ${colName}/${docId}:`, data); },
          update: async (data: any) => { console.log(`[Firestore STUB] update ${colName}/${docId}:`, data); },
          delete: async () => { console.log(`[Firestore STUB] delete ${colName}/${docId}`); },
        }),
        where: () => ({
          get: async () => ({ empty: true, docs: [] })
        })
      };
    },
    runTransaction: async (cb: any) => {
      console.warn("[Firestore STUB] runTransaction called");
      return cb({
        get: async () => ({ exists: false, data: () => ({}) }),
        set: () => {},
        update: () => {}
      });
    }
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe Webhook MUST come BEFORE express.json() to get raw body
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      console.error("Missing signature or secret for webhook");
      return res.status(400).send("Webhook Error: Missing signature or secret");
    }

    let event;
    try {
      event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      
      if (userId) {
        console.log(`Fulfilling credits for user: ${userId}`);
        const userRef = db.collection("users").doc(userId);
        
        try {
          await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            // We'll give 500 units for a standard purchase, or read from metadata if we have multiple products
            const currentCredits = userDoc.exists ? (userDoc.data()?.credits || 0) : 50;
            const refillAmount = 500; 
            transaction.update(userRef, { credits: currentCredits + refillAmount });
          });
          console.log(`Credits fulfilled successfully for ${userId}`);
        } catch (error) {
          console.error(`Error updating credits for user ${userId}:`, error);
        }
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Authentication Middleware
  const authenticateUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Single-user private mode: Default to stable owner profile to allow seamless offline access with no login barriers
    const mockUser = {
      uid: "lumina_owner",
      name: "Właściciel Lumina",
      email: "owner@lumina.local",
    };

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      (req as any).user = mockUser;
      return next();
    }

    const idToken = authHeader.split("Bearer ")[1];
    if (idToken === "lumina_owner_token" || idToken === "mock_token" || idToken === "null" || idToken === "undefined") {
      (req as any).user = mockUser;
      return next();
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      (req as any).user = decodedToken;
      next();
    } catch (error) {
      // Direct pass for private owner
      (req as any).user = mockUser;
      next();
    }
  };

  // Credit Validation Middleware
  const validateCredits = (cost: number) => async (req: any, res: express.Response, next: express.NextFunction) => {
    const userId = req.user.uid;
    const userRef = db.collection("users").doc(userId);

    try {
      const result = await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists) {
          // Initialize user with high local load balance (credits)
          transaction.set(userRef, {
            userId,
            name: req.user.name || "Właściciel Lumina",
            credits: 999999,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          return { success: true, remaining: 999999 };
        }

        const currentCredits = userDoc.data()?.credits || 0;
        // In free, single-user private mode, automatically top up if credit runs low
        if (currentCredits < cost || currentCredits < 1000) {
          const autoRefill = 999999;
          transaction.update(userRef, { credits: autoRefill });
          return { success: true, remaining: autoRefill };
        }

        const newCredits = currentCredits - cost;
        transaction.update(userRef, { credits: newCredits });
        return { success: true, remaining: newCredits };
      });

      req.remainingCredits = result.remaining;
      next();
    } catch (error) {
      console.warn("Using local credit backup mode:", error.message);
      req.remainingCredits = 999999;
      next();
    }
  };

  // API Route for Image Generation
  app.post("/api/generate-image", authenticateUser, validateCredits(5), async (req: any, res) => {
    try {
      const { prompt, aspectRatio } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            {
              text: prompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || "16:9",
          },
        },
      });

      let imageData = "";
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageData = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!imageData) {
        throw new Error("No image data returned from Gemini");
      }

      res.json({ imageUrl: imageData, remainingCredits: req.remainingCredits });
    } catch (error: any) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: error.message || "Failed to generate image" });
    }
  });

  // For other Gemini tasks, we can add more routes here
  app.post("/api/generate-content", authenticateUser, validateCredits(1), async (req: any, res) => {
    try {
      const { model, contents, config } = req.body;
      const response = await ai.models.generateContent({
        model: model || "gemini-3-flash-preview",
        contents: typeof contents === "string" ? { parts: [{ text: contents }] } : contents,
        config
      });
      res.json({ text: response.text, response, remainingCredits: req.remainingCredits });
    } catch (error: any) {
      console.error("Error generating content:", error);
      res.status(500).json({ error: error.message || "Failed to generate content" });
    }
  });

  app.get("/api/user-credits", authenticateUser, async (req: any, res) => {
    try {
      const userDoc = await db.collection("users").doc(req.user.uid).get();
      const credits = userDoc.exists ? (userDoc.data()?.credits || 0) : 50; 
      res.json({ credits });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch credits" });
    }
  });

  // Stripe Checkout Session
  app.post("/api/stripe/create-checkout-session", authenticateUser, async (req: any, res) => {
    try {
      const { priceId } = req.body;
      const effectivePriceId = priceId || process.env.STRIPE_PRICE_ID_CREDITS;

      if (!effectivePriceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      const session = await getStripe().checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: effectivePriceId,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.APP_URL || "http://localhost:3000" }?success=true`,
        cancel_url: `${process.env.APP_URL || "http://localhost:3000" }?canceled=true`,
        client_reference_id: req.user.uid,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe Session Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Publishing Routes
  app.post("/api/publish/wordpress", authenticateUser, validateCredits(10), async (req: any, res) => {
    try {
      const { title, content, status = "draft" } = req.body;
      const { WP_URL, WP_USERNAME, WP_APPLICATION_PASSWORD } = process.env;

      if (!WP_URL || !WP_USERNAME || !WP_APPLICATION_PASSWORD) {
        return res.status(500).json({ error: "WordPress configuration missing on server" });
      }

      const auth = Buffer.from(`${WP_USERNAME}:${WP_APPLICATION_PASSWORD}`).toString('base64');

      const response = await axios.post(`${WP_URL}/wp-json/wp/v2/posts`, {
        title,
        content,
        status
      }, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      res.json({ success: true, url: response.data.link, remainingCredits: req.remainingCredits });
    } catch (error: any) {
      console.error("WP Publish Error:", error.response?.data || error.message);
      res.status(500).json({ error: "WordPress publishing failed: " + (error.response?.data?.message || error.message) });
    }
  });

  app.post("/api/publish/medium", authenticateUser, validateCredits(10), async (req: any, res) => {
    try {
      const { title, content, canonicalUrl, tags, publishStatus = "draft" } = req.body;
      const token = process.env.MEDIUM_INTEGRATION_TOKEN;

      if (!token) {
        return res.status(500).json({ error: "Medium configuration missing on server" });
      }

      // 1. Get User ID
      const userResponse = await axios.get('https://api.medium.com/v1/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const userId = userResponse.data.data.id;

      // 2. Publish
      const publishResponse = await axios.post(`https://api.medium.com/v1/users/${userId}/posts`, {
        title,
        contentFormat: 'html',
        content,
        canonicalUrl,
        tags,
        publishStatus
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      res.json({ success: true, url: publishResponse.data.data.url, remainingCredits: req.remainingCredits });
    } catch (error: any) {
      console.error("Medium Publish Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Medium publishing failed: " + (error.response?.data?.errors?.[0]?.message || error.message) });
    }
  });

  // LinkedIn OAuth Status and Handlers
  app.get("/api/linkedin/status", authenticateUser, async (req: any, res) => {
    try {
      const userDoc = await db.collection("users").doc(req.user.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        res.json({
          connected: !!data?.linkedinConnected,
          name: data?.linkedinName || "",
          companyId: data?.linkedinCompanyId || "",
          companyName: data?.linkedinCompanyName || ""
        });
      } else {
        res.json({ connected: false });
      }
    } catch (error: any) {
      console.error("LinkedIn status fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/linkedin/save-company", authenticateUser, async (req: any, res) => {
    try {
      const { companyId, companyName } = req.body;
      await db.collection("users").doc(req.user.uid).set({
        linkedinCompanyId: companyId || "",
        linkedinCompanyName: companyName || ""
      }, { merge: true });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/linkedin/disconnect", authenticateUser, async (req: any, res) => {
    try {
      await db.collection("users").doc(req.user.uid).set({
        linkedinConnected: false,
        linkedinToken: admin.firestore.FieldValue.delete(),
        linkedinName: admin.firestore.FieldValue.delete(),
        linkedinExpiresAt: admin.firestore.FieldValue.delete()
      }, { merge: true });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/linkedin/url", authenticateUser, (req: any, res) => {
    const redirectUri = `${process.env.APP_URL || "http://localhost:3000"}/auth/linkedin/callback`;
    const clientId = process.env.LINKEDIN_CLIENT_ID;

    if (!clientId) {
      return res.status(500).json({ error: "LinkedIn Client ID is not configured on the server." });
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state: req.user.uid,
      scope: "w_member_social w_organization_social"
    });

    const url = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    res.json({ url });
  });

  // Public LinkedIn OAuth Callback URL
  app.get(["/auth/linkedin/callback", "/auth/linkedin/callback/"], async (req, res) => {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error("LinkedIn callback error:", error, error_description);
      return res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${error_description || error}' }, '*');
                window.close();
              }
            </script>
            <p style="color: red; font-family: sans-serif;">Error during LinkedIn Connection: ${error_description || error}</p>
          </body>
        </html>
      `);
    }

    if (!code || !state) {
      return res.status(400).send("Callback error: Missing code or state parameters");
    }

    try {
      const redirectUri = `${process.env.APP_URL || "http://localhost:3000"}/auth/linkedin/callback`;
      const response = await axios.post("https://www.linkedin.com/oauth/v2/accessToken", 
        new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: redirectUri,
          client_id: process.env.LINKEDIN_CLIENT_ID || "",
          client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
        }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const token = response.data.access_token;
      let name = "LinkedIn Developer Account";

      // Best effort profile name discovery
      try {
        const userInfoRes = await axios.get("https://api.linkedin.com/v2/userinfo", {
          headers: { Authorization: `Bearer ${token}` }
        });
        name = userInfoRes.data.name || `${userInfoRes.data.given_name || ""} ${userInfoRes.data.family_name || ""}`.trim() || name;
      } catch (profileError) {
        console.warn("Failed fetching userinfo, trying me API", profileError);
        try {
          const profileRes = await axios.get("https://api.linkedin.com/v2/me", {
            headers: { Authorization: `Bearer ${token}` }
          });
          name = `${profileRes.data.localizedFirstName || ""} ${profileRes.data.localizedLastName || ""}`.trim() || name;
        } catch (meErr) {
          console.warn("Both profiles fetch failed, defaulting name");
        }
      }

      const userId = state as string;
      await db.collection("users").doc(userId).set({
        linkedinConnected: true,
        linkedinToken: token,
        linkedinName: name,
        linkedinExpiresAt: Date.now() + (response.data.expires_in * 1000)
      }, { merge: true });

      res.send(`
        <html>
          <body style="background: #0f172a; color: white; text-align: center; font-family: sans-serif; display: flex; flex-direction: column; justify-content: center; height: 100vh; margin: 0;">
            <div style="padding: 24px; border-radius: 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); display: inline-block; margin: auto;">
              <h2 style="color: #00bcd4; margin-top: 0;">LinkedIn Connected!</h2>
              <p style="color: #94a3b8; font-size: 14px;">Connected as <strong>${name}</strong>.</p>
              <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">This window will close automatically shortly.</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', service: 'linkedin' }, '*');
                setTimeout(() => window.close(), 1200);
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    } catch (exchangeError: any) {
      console.error("Token exchange failed:", exchangeError.response?.data || exchangeError.message);
      res.status(500).send(`Token exchange failed: ${exchangeError.response?.data?.error_description || exchangeError.message}`);
    }
  });

  app.post("/api/publish/linkedin", authenticateUser, validateCredits(10), async (req: any, res) => {
    try {
      const { title, commentary, postOnBehalfOf = "member", companyId } = req.body;
      const userRef = db.collection("users").doc(req.user.uid);
      const userDoc = await userRef.get();
      
      const token = userDoc.data()?.linkedinToken;
      if (!token) {
        return res.status(400).json({ error: "LinkedIn account not connected on server. Please connect it in Settings." });
      }

      // Check if posting to corporate organization page or personal feed
      let author = "";
      if (postOnBehalfOf === "organization") {
        const targetId = companyId || userDoc.data()?.linkedinCompanyId;
        if (!targetId) {
          return res.status(400).json({ error: "LinkedIn Company ID is required for organization posts." });
        }
        // Format of corporate ID
        author = `urn:li:organization:${targetId.trim().replace(/\D/g, "")}`;
      } else {
        try {
          const userInfoRes = await axios.get("https://api.linkedin.com/v2/userinfo", {
            headers: { Authorization: `Bearer ${token}` }
          });
          author = `urn:li:person:${userInfoRes.data.sub}`;
        } catch (meError) {
          try {
            const meRes = await axios.get("https://api.linkedin.com/v2/me", {
              headers: { Authorization: `Bearer ${token}` }
            });
            author = `urn:li:person:${meRes.data.id}`;
          } catch (altErr) {
            return res.status(400).json({ error: "Failed to resolve personal LinkedIn profile credentials." });
          }
        }
      }

      // Format commentary
      const textToPublish = commentary || `${title}`;

      // Call LinkedIn share Post API
      const response = await axios.post("https://api.linkedin.com/v2/posts", {
        author,
        commentary: textToPublish,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: []
        },
        lifecycleState: "PUBLISHED"
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      const postId = response.headers["x-restli-id"] || response.data?.id;
      const postUrl = postId ? `https://www.linkedin.com/feed/update/${postId}` : "https://www.linkedin.com/";

      res.json({ success: true, url: postUrl, remainingCredits: req.remainingCredits });
    } catch (error: any) {
      console.error("LinkedIn Share Error:", error.response?.data || error.message);
      res.status(500).json({ error: "LinkedIn publishing failed: " + (error.response?.data?.message || error.message) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
