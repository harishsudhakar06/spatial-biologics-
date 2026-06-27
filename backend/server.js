const express = require("express");
const cors = require("cors");
const axios = require("axios");
const https = require("https");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const fs = require("fs");
const XLSX = require("xlsx");
const path = require("path");
const dns = require("dns");
const multer = require("multer");
const { spawn } = require("child_process");

require("dotenv").config();

dns.setDefaultResultOrder("ipv4first");

const app = express();
app.set("trust proxy", true);
const PORT = 5000;

/* ========================= DB SETUP ========================= */
const DB_FILE = path.join(__dirname, "db.json");

function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], otps: [] }, null, 2));
  }
}

function readDB() {
  initDB();
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return { users: [], otps: [] }; }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function getUserByEmail(email) {
  return readDB().users.find(u => u.email === email) || null;
}

function getUserById(id) {
  return readDB().users.find(u => u.id === id) || null;
}

function createUser({ username, email, password, phone = "", designation = "", affiliation = "" }) {
  const db = readDB();
  const newUser = {
    id: Date.now().toString(), username, email, password,
    phone, designation, affiliation, createdAt: new Date().toISOString()
  };
  db.users.push(newUser);
  writeDB(db);
  return newUser;
}

function updateUserPassword(email, hashedPassword) {
  const db = readDB();
  const idx = db.users.findIndex(u => u.email === email);
  if (idx === -1) return false;
  db.users[idx].password = hashedPassword;
  writeDB(db);
  return true;
}

function saveOTP(email, otp) {
  const db = readDB();
  db.otps = db.otps.filter(o => o.email !== email);
  db.otps.push({ email, otp, expiresAt: Date.now() + 5 * 60 * 1000 });
  writeDB(db);
}

function getOTP(email) {
  return readDB().otps.find(o => o.email === email) || null;
}

function deleteOTP(email) {
  const db = readDB();
  db.otps = db.otps.filter(o => o.email !== email);
  writeDB(db);
}

function cleanExpiredOTPs() {
  const db = readDB();
  db.otps = db.otps.filter(o => o.expiresAt > Date.now());
  writeDB(db);
}

initDB();

/* ========================= EXCEL HELPER ========================= */
function buildExcelBuffer() {
  const db = readDB();
  const safeUsers = db.users.map(({ password, ...rest }) => rest);
  const wsData = [
    ["#", "Name", "Email", "Phone", "Designation", "Affiliation", "Registered On"],
    ...safeUsers.map((u, i) => [
      i + 1,
      u.username || "",
      u.email || "",
      u.phone || "",
      u.designation || "",
      u.affiliation || "",
      u.createdAt ? new Date(u.createdAt).toLocaleString("en-IN") : "",
    ])
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 4 }, { wch: 22 }, { wch: 30 }, { wch: 15 },
    { wch: 20 }, { wch: 25 }, { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Users");
  return {
    buffer: XLSX.write(wb, { type: "buffer", bookType: "xlsx" }),
    total: safeUsers.length
  };
}

/* ========================= EMAIL CONFIG ========================= */
const EMAIL_USER = process.env.EMAIL_USER || "customersupport@spatialbiologics.com";
const EMAIL_PASS = process.env.EMAIL_PASS || "bakhdddbaajnfvbk";
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "587");

let transporterConfig;

if (EMAIL_HOST) {
  transporterConfig = {
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: false,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  };
  console.log(`📧 Email: custom SMTP ${EMAIL_HOST}:${EMAIL_PORT}`);
} else if (EMAIL_USER.includes("@gmail.com")) {
  transporterConfig = {
    service: "gmail",
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  };
  console.log(`📧 Email: Gmail SMTP`);
} else {
  const domain = EMAIL_USER.split("@")[1];
  transporterConfig = {
    host: `mail.${domain}`,
    port: 587,
    secure: false,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  };
  console.log(`📧 Email: auto SMTP mail.${domain}:587`);
}

const transporter = nodemailer.createTransport(transporterConfig);

transporter.verify((err, success) => {
  if (err) {
    console.error("❌ Email transporter error:", err.message);
    console.log("   OTP will still be printed in terminal as fallback");
  } else {
    console.log("✅ Email transporter ready — OTP emails will be sent");
  }
});

async function sendOTPEmail(toEmail, otp) {
  try {
    await transporter.sendMail({
      from: `"Spatial Biologics" <${EMAIL_USER}>`,
      to: toEmail,
      subject: "Your Password Reset OTP — Spatial Biologics",
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:28px;
                    border:1px solid #e5e7eb;border-radius:12px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
            <span style="font-size:20px">⚗️</span>
            <span style="font-weight:700;font-size:16px;color:#1e3a8a">Spatial Biologics</span>
          </div>
          <h2 style="color:#111827;font-size:18px;margin-bottom:8px">Password Reset OTP</h2>
          <p style="color:#6b7280;font-size:14px;margin-bottom:20px">
            Use the OTP below to reset your password. It expires in <strong>5 minutes</strong>.
          </p>
          <div style="font-size:36px;font-weight:800;color:#2563eb;letter-spacing:10px;
                      text-align:center;padding:20px;background:#eff6ff;
                      border-radius:10px;margin-bottom:20px">
            ${otp}
          </div>
          <p style="color:#9ca3af;font-size:12px">
            If you did not request this, please ignore this email. Your account is safe.
          </p>
        </div>
      `,
    });
    console.log(`✅ OTP email sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.error("❌ Email send failed:", err.message);
    return false;
  }
}

/* ========================= IMPORT ROUTES ========================= */
let proteinRoutes;
try {
  proteinRoutes = require("./routes/proteinRoutes");
  console.log("✅ proteinRoutes loaded");
} catch (err) {
  console.error("❌ Failed to load proteinRoutes:", err.message);
  process.exit(1);
}

/* ========================= MIDDLEWARE ========================= */
app.use(express.json({ limit: "10mb" }));

// Dynamic CORS configuration supporting local development and production domains
const corsOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map(o => o.trim())
  : "http://localhost:5173";
app.use(cors({ origin: corsOrigins, credentials: true }));

// Dynamic session cookie settings for secure/production environments
const isProd = process.env.NODE_ENV === "production";
app.use(session({
  secret: "chemvault_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,
    httpOnly: true,
    sameSite: isProd ? (process.env.SESSION_SAME_SITE || "none") : "lax",
    maxAge: 86400000
  },
}));

/* ========================= CONTACT ROUTE ========================= */
try {
  const contactRoute = require("./routes/contactRoute");
  app.use("/api/contact", contactRoute);
  console.log("✅ contactRoute loaded");
} catch (err) {
  console.warn("⚠️ contactRoute not found:", err.message);
}

console.log("🚀 ChemVault Backend Starting...");

/* ========================= AXIOS INSTANCE ========================= */
const pubchem = axios.create({
  timeout: 45000,
  httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 10 }),
  headers: { "Accept-Encoding": "gzip, deflate", "Connection": "keep-alive" },
});

/* ========================= RETRY HELPER ========================= */
async function withRetry(fn, retries = 3, delayMs = 1000) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = i === retries;
      const status = err.response?.status;
      if (status === 404) throw err;
      if (isLast) throw err;
      const wait = delayMs * (i + 1);
      console.log(`  Retry ${i + 1}/${retries} in ${wait}ms — ${err.message}`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

/* ========================= SMILES HELPER ========================= */
async function fetchSmiles(cid) {
  for (const prop of ["IsomericSMILES", "CanonicalSMILES"]) {
    try {
      const r = await pubchem.get(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/${prop}/TXT`
      );
      const s = r.data?.trim();
      if (s && s.length > 5) return s;
    } catch {}
  }
  return "Not Available";
}

/* ========================= BASIC ROUTES ========================= */
app.get("/", (req, res) =>
  res.json({ success: true, message: "ChemVault Backend Running", modules: ["Ligand", "Protein"] })
);
app.get("/api/health", (req, res) =>
  res.json({ success: true, status: "OK", uptime: process.uptime() })
);

/* ========================= AUTH ROUTES ========================= */
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password, phone = "", designation = "", affiliation = "" } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: "Name, email and password are required" });

    if (getUserByEmail(email))
      return res.status(400).json({ error: "An account with this email already exists" });

    const hashed  = await bcrypt.hash(password, 10);
    const newUser = createUser({ username, email, password: hashed, phone, designation, affiliation });

    req.session.userId = newUser.id;

    // ── Notify admin of new registration with Excel ────────────────
    try {
      const { buffer: excelBuffer, total } = buildExcelBuffer();
      const dateStr = new Date().toLocaleString("en-IN");
      await transporter.sendMail({
        from: `"ChemVault" <${EMAIL_USER}>`,
        to: "customersupport@spatialbiologics.com",
        subject: `🧪 New Registration — ${username} | Total Users: ${total}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;
                      border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:24px 32px">
              <h2 style="color:#fff;margin:0;font-size:20px">🧪 New User Registered</h2>
              <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px">ChemVault · Spatial Biologics</p>
            </div>
            <div style="padding:28px 32px;background:#fff">
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <tr><td style="padding:8px 0;color:#64748b;width:140px;font-weight:600">Name</td><td style="padding:8px 0;color:#1e293b">${username}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Email</td><td style="padding:8px 0;color:#1e293b"><a href="mailto:${email}" style="color:#2563eb">${email}</a></td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Phone</td><td style="padding:8px 0;color:#1e293b">${phone || "—"}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Designation</td><td style="padding:8px 0;color:#1e293b">${designation || "—"}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Affiliation</td><td style="padding:8px 0;color:#1e293b">${affiliation || "—"}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Registered On</td><td style="padding:8px 0;color:#1e293b">${dateStr}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Total Users</td><td style="padding:8px 0;color:#1e293b;font-weight:700">${total}</td></tr>
              </table>
              <div style="margin-top:16px;padding:12px 16px;background:#f0fdf4;
                          border-radius:8px;border-left:4px solid #16a34a;
                          font-size:13px;color:#15803d;font-weight:600">
                ✅ Full user list attached as Excel
              </div>
            </div>
            <div style="background:#f8fafc;padding:14px 32px;font-size:12px;
                        color:#94a3b8;text-align:center">
              Sent via ChemVault · Spatial Biologics
            </div>
          </div>
        `,
        attachments: [{
          filename: `chemvault_users_${new Date().toISOString().slice(0, 10)}.xlsx`,
          content: excelBuffer,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }],
      });
      console.log(`✅ Admin notified with Excel on registration: ${email}`);
    } catch (mailErr) {
      console.warn("⚠️ Admin notification failed:", mailErr.message);
    }
    // ── End admin notification ─────────────────────────────────────

    res.json({ success: true, user: { id: newUser.id, username: newUser.username, email: newUser.email } });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = getUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid email or password" });

    req.session.userId = user.id;

    // ── Notify admin on login with Excel ──────────────────────────
    try {
      const { buffer: excelBuffer, total } = buildExcelBuffer();
      const dateStr = new Date().toLocaleString("en-IN");
      await transporter.sendMail({
        from: `"ChemVault" <${EMAIL_USER}>`,
        to: "customersupport@spatialbiologics.com",
        subject: `🔐 User Login — ${user.username} | Total Users: ${total}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;
                      border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:24px 32px">
              <h2 style="color:#fff;margin:0;font-size:20px">🔐 User Signed In</h2>
              <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px">ChemVault · Spatial Biologics</p>
            </div>
            <div style="padding:28px 32px;background:#fff">
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <tr><td style="padding:8px 0;color:#64748b;width:140px;font-weight:600">Name</td><td style="padding:8px 0;color:#1e293b">${user.username}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Email</td><td style="padding:8px 0;color:#1e293b"><a href="mailto:${user.email}" style="color:#2563eb">${user.email}</a></td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Login Time</td><td style="padding:8px 0;color:#1e293b">${dateStr}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Total Users</td><td style="padding:8px 0;color:#1e293b;font-weight:700">${total}</td></tr>
              </table>
              <div style="margin-top:16px;padding:12px 16px;background:#eff6ff;
                          border-radius:8px;border-left:4px solid #2563eb;
                          font-size:13px;color:#1d4ed8;font-weight:600">
                📎 Full user list attached as Excel
              </div>
            </div>
            <div style="background:#f8fafc;padding:14px 32px;font-size:12px;
                        color:#94a3b8;text-align:center">
              Sent via ChemVault · Spatial Biologics
            </div>
          </div>
        `,
        attachments: [{
          filename: `chemvault_users_${new Date().toISOString().slice(0, 10)}.xlsx`,
          content: excelBuffer,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }],
      });
      console.log(`✅ Admin notified with Excel on login: ${user.email}`);
    } catch (mailErr) {
      console.warn("⚠️ Admin login notification failed:", mailErr.message);
    }
    // ── End login notification ─────────────────────────────────────

    res.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get("/api/me", (req, res) => {
  try {
    if (!req.session?.userId)
      return res.status(401).json({ error: "Not logged in" });
    const user = getUserById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ error: "User not found" });
    }
    res.json({ id: user.id, username: user.username, email: user.email });
  } catch (err) {
    res.status(401).json({ error: "Not logged in" });
  }
});

/* ========================= FORGOT PASSWORD ========================= */
app.post("/api/forgot-password/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = getUserByEmail(email);
    if (!user)
      return res.status(404).json({ error: "No account found with this email address" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    saveOTP(email, otp);

    const sent = await sendOTPEmail(email, otp);

    if (sent) {
      res.json({ success: true, message: "OTP sent to your email address. Check your inbox." });
    } else {
      console.log(`[DEV] OTP for ${email}: ${otp}`);
      res.json({
        success: true,
        message: `OTP sent. If email not received, check VS terminal. (Dev OTP: ${otp})`,
        devOtp: otp
      });
    }
  } catch (err) {
    console.error("Send OTP error:", err.message);
    res.status(500).json({ error: "Failed to send OTP. Please try again." });
  }
});

app.post("/api/forgot-password/verify-otp", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ error: "Email, OTP and new password are all required" });

    if (newPassword.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    const record = getOTP(email);
    if (!record)
      return res.status(400).json({ error: "No OTP found. Please request a new one." });

    if (Date.now() > record.expiresAt) {
      deleteOTP(email);
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    if (record.otp !== otp.toString().trim())
      return res.status(400).json({ error: "Incorrect OTP. Please try again." });

    const hashed  = await bcrypt.hash(newPassword, 10);
    const updated = updateUserPassword(email, hashed);
    if (!updated)
      return res.status(404).json({ error: "User not found" });

    deleteOTP(email);
    res.json({ success: true, message: "Password updated successfully! Please sign in." });
  } catch (err) {
    console.error("Verify OTP error:", err.message);
    res.status(500).json({ error: "Failed to verify OTP. Please try again." });
  }
});

setInterval(cleanExpiredOTPs, 10 * 60 * 1000);

/* ========================= LIGAND SEARCH ========================= */
app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.status(400).json({ error: "Query required" });
    console.log("🔍 Searching:", q);

    let cids = [];
    try {
      const cidRes = await withRetry(() =>
        pubchem.get(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(q)}/cids/JSON`)
      );
      cids = cidRes.data?.IdentifierList?.CID || [];
    } catch (err) {
      if (err.response?.status !== 404) console.error("CID lookup error:", err.message);
    }

    if (!cids.length) {
      try {
        const ftRes = await withRetry(() =>
          pubchem.get(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(q)}/cids/JSON?name_type=word`)
        );
        cids = ftRes.data?.IdentifierList?.CID || [];
      } catch {}
    }

    if (!cids.length) {
      console.log("No results found for:", q);
      return res.json({ success: true, total: 0, results: [] });
    }

    cids = [...new Set(cids)].slice(0, 10);
    console.log(`Found ${cids.length} CIDs for "${q}"`);

    const propRes = await withRetry(() =>
      pubchem.get(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cids.join(",")}/property/Title,MolecularFormula,MolecularWeight,IUPACName,InChI,InChIKey,XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,ExactMass,RotatableBondCount/JSON`)
    );
    let properties = propRes.data?.PropertyTable?.Properties || [];

    const seenCids = new Set();
    properties = properties.filter(i => {
      if (seenCids.has(i.CID)) return false;
      seenCids.add(i.CID); return true;
    });
    const seenKeys = new Set();
    properties = properties.filter(i => {
      if (!i.InChIKey) return true;
      if (seenKeys.has(i.InChIKey)) return false;
      seenKeys.add(i.InChIKey); return true;
    });

    console.log(`Fetching SMILES for ${properties.length} compounds...`);
    const mainResults = await Promise.all(
      properties.map(async item => {
        const smiles = await fetchSmiles(item.CID);
        console.log(`  CID ${item.CID} SMILES: ${smiles.slice(0, 40)}`);
        return {
          cid: item.CID,
          name: item.IUPACName || item.Title || q,
          formula: item.MolecularFormula || "N/A",
          weight: item.MolecularWeight || "N/A",
          image2D: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${item.CID}/PNG`,
          has2D: true, has3D: true, hasCrystal: true,
          synonyms: [item.Title || q],
          xlogp: item.XLogP ?? "N/A",
          hbondDonor: item.HBondDonorCount ?? "N/A",
          hbondAcceptor: item.HBondAcceptorCount ?? "N/A",
          tpsa: item.TPSA ?? "N/A",
          smiles,
          inchikey: item.InChIKey || "N/A",
          inchi: item.InChI || "N/A",
          exactMass: item.ExactMass || "N/A",
          rotatableBonds: item.RotatableBondCount ?? "N/A",
          description: `${item.Title || item.IUPACName} retrieved from PubChem.`,
          createDate: new Date().toLocaleDateString(),
        };
      })
    );

    let finalResults = [...mainResults];
    if (mainResults.length === 1) {
      try {
        const simRes = await withRetry(() =>
          pubchem.get(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsimilarity_2d/cid/${mainResults[0].cid}/cids/JSON?Threshold=90`)
        );
        let simCids = [...new Set(simRes.data?.IdentifierList?.CID || [])]
          .filter(c => !seenCids.has(c)).slice(0, 5);

        if (simCids.length) {
          const simPropRes = await withRetry(() =>
            pubchem.get(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${simCids.join(",")}/property/Title,MolecularFormula,MolecularWeight,IUPACName,InChIKey/JSON`)
          );
          const simSeen = new Set([...seenKeys]);
          const uniqueSim = (simPropRes.data?.PropertyTable?.Properties || []).filter(i => {
            if (!i.InChIKey) return true;
            if (simSeen.has(i.InChIKey)) return false;
            simSeen.add(i.InChIKey); return true;
          });
          const simWithSmiles = await Promise.all(
            uniqueSim.map(async item => ({
              cid: item.CID,
              name: item.IUPACName || item.Title || "Similar Compound",
              formula: item.MolecularFormula || "N/A",
              weight: item.MolecularWeight || "N/A",
              smiles: await fetchSmiles(item.CID),
              inchikey: item.InChIKey || "N/A",
              image2D: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${item.CID}/PNG`,
              has2D: true, has3D: true, hasCrystal: true,
            }))
          );
          finalResults = [...finalResults, ...simWithSmiles];
        }
      } catch (e) { console.log("Similar compounds fetch failed:", e.message); }
    }

    console.log(`✅ Returning ${finalResults.length} results for "${q}"`);
    res.json({ success: true, total: finalResults.length, results: finalResults });
  } catch (err) {
    console.error("Search Error:", err.message);
    res.status(500).json({ error: "Ligand search failed: " + err.message });
  }
});

/* ========================= SUMMARY ========================= */
app.get("/api/summary/:cid", async (req, res) => {
  try {
    const cid = req.params.cid;
    const smiles = await fetchSmiles(cid);
    const result = await withRetry(() =>
      pubchem.get(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/Title,MolecularFormula,MolecularWeight,IUPACName,InChI,InChIKey,XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,ExactMass,RotatableBondCount/JSON`)
    );
    const item = result.data?.PropertyTable?.Properties?.[0];
    if (!item) return res.status(404).json({ error: "Compound not found" });
    res.json({
      cid: item.CID, name: item.IUPACName || item.Title,
      formula: item.MolecularFormula, weight: item.MolecularWeight,
      image2D: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${item.CID}/PNG`,
      synonyms: [item.Title], smiles, inchikey: item.InChIKey, inchi: item.InChI,
      xlogp: item.XLogP, hbondDonor: item.HBondDonorCount,
      hbondAcceptor: item.HBondAcceptorCount, exactMass: item.ExactMass,
      rotatableBonds: item.RotatableBondCount, tpsa: item.TPSA,
      createDate: new Date().toLocaleDateString(),
      allDescriptions: [{ text: `${item.Title || item.IUPACName} from PubChem.`, source: "PubChem" }],
    });
  } catch (err) {
    console.error("Summary Error:", err.message);
    res.status(500).json({ error: "Ligand summary failed" });
  }
});

/* ========================= STRUCTURE ========================= */
app.get("/api/structure/:cid/:type", (req, res) => {
  const { cid, type } = req.params;
  if (type === "2d") return res.json({ type: "2d", imageUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=600x600` });
  if (type === "3d") return res.json({ type: "3d", embedUrl: `https://embed.molview.org/v1/?mode=balls&cid=${cid}` });
  if (type === "crystal") return res.json({ type: "crystal", embedUrl: `https://embed.molview.org/v1/?mode=wireframe&cid=${cid}` });
  return res.status(400).json({ error: "Invalid structure type" });
});

/* ========================= SIMILAR ========================= */
app.get("/api/similar/:cid", async (req, res) => {
  try {
    const cid = req.params.cid;
    const simRes = await withRetry(() =>
      pubchem.get(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsimilarity_2d/cid/${cid}/cids/JSON?Threshold=90`)
    );
    let simCids = [...new Set(simRes.data?.IdentifierList?.CID || [])].slice(0, 8);
    if (!simCids.length) return res.json({ results: [] });

    const propRes = await withRetry(() =>
      pubchem.get(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${simCids.join(",")}/property/Title,MolecularFormula,MolecularWeight,IUPACName,InChIKey/JSON`)
    );
    let properties = propRes.data?.PropertyTable?.Properties || [];
    const seen = new Set();
    properties = properties.filter(i => {
      if (!i.InChIKey) return true;
      if (seen.has(i.InChIKey)) return false;
      seen.add(i.InChIKey); return true;
    });
    const results = await Promise.all(
      properties.map(async item => ({
        cid: item.CID,
        name: item.IUPACName || item.Title || "Unknown",
        formula: item.MolecularFormula || "N/A",
        weight: item.MolecularWeight || "N/A",
        smiles: await fetchSmiles(item.CID),
        inchikey: item.InChIKey || "N/A",
        image2D: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${item.CID}/PNG`,
      }))
    );
    res.json({ results });
  } catch (err) {
    console.error("Similar error:", err.message);
    res.json({ results: [] });
  }
});

/* ========================= PROTEIN ROUTES ========================= */
app.use("/api/proteins", proteinRoutes);
app.use("/api/protein",  proteinRoutes);

const pdbSearchRoutes = require("./routes/pdbSearchRoutes");
app.use("/api/pdb", pdbSearchRoutes);

const deeppkRoutes = require("./routes/deeppk");
app.use("/api/deeppk", deeppkRoutes);

const peptideCutterRoutes = require("./routes/peptideCutterRoutes");
app.use("/api/peptide-cutter", peptideCutterRoutes);

/* ========================= WORKSPACE SYNC & RETENTION ========================= */
function findNewItems(oldProjects, newProjects) {
  const newItems = {
    downloadedLigands: [],
    ligandFiles: [],
    downloadedProteins: [],
    dockingJobs: []
  };

  const getKeys = (project, field, keyFn) => {
    if (!project || !project[field]) return new Set();
    return new Set(project[field].map(keyFn));
  };

  for (const [projId, newProj] of Object.entries(newProjects || {})) {
    const oldProj = oldProjects?.[projId] || {};

    const oldLigandCids = getKeys(oldProj, 'downloadedLigands', l => String(l.cid));
    const oldFileKeys = getKeys(oldProj, 'ligandFiles', f => String(f.key));
    const oldProteinKeys = getKeys(oldProj, 'downloadedProteins', p => `${p.accession}_${p.format}`);
    const oldJobNames = getKeys(oldProj, 'dockingJobs', j => String(j.name));

    if (newProj.downloadedLigands) {
      newProj.downloadedLigands.forEach(l => {
        if (!oldLigandCids.has(String(l.cid))) {
          newItems.downloadedLigands.push({ ...l, projectId: projId });
        }
      });
    }

    if (newProj.ligandFiles) {
      newProj.ligandFiles.forEach(f => {
        if (!oldFileKeys.has(String(f.key))) {
          newItems.ligandFiles.push({ ...f, projectId: projId });
        }
      });
    }

    if (newProj.downloadedProteins) {
      newProj.downloadedProteins.forEach(p => {
        const key = `${p.accession}_${p.format}`;
        if (!oldProteinKeys.has(key)) {
          newItems.downloadedProteins.push({ ...p, projectId: projId });
        }
      });
    }

    if (newProj.dockingJobs) {
      newProj.dockingJobs.forEach(j => {
        if (!oldJobNames.has(String(j.name))) {
          newItems.dockingJobs.push({ ...j, projectId: projId });
        }
      });
    }
  }

  return newItems;
}

app.get("/api/workspace", (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not logged in" });
    }
    const db = readDB();
    if (!db.workspaces) db.workspaces = {};
    
    const workspace = db.workspaces[req.session.userId] || {
      activeProjectId: "SPB001",
      projects: {
        "SPB001": {
          downloadedLigands: [],
          ligandFiles: [],
          downloadedProteins: [],
          dockingJobs: []
        }
      }
    };
    
    res.json({ success: true, workspace });
  } catch (err) {
    console.error("Get workspace error:", err.message);
    res.status(500).json({ error: "Failed to get workspace" });
  }
});

app.post("/api/workspace", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not logged in" });
    }
    
    const newWorkspace = req.body;
    if (!newWorkspace || !newWorkspace.projects) {
      return res.status(400).json({ error: "Invalid workspace data" });
    }
    
    const db = readDB();
    if (!db.workspaces) db.workspaces = {};
    
    const oldWorkspace = db.workspaces[req.session.userId] || { projects: {} };
    
    // Find new items added to notify customer support and set timestamps
    const newItems = findNewItems(oldWorkspace.projects, newWorkspace.projects);
    
    // Set addedAt and warningSent timestamps for all new items in the workspace object
    const nowStr = new Date().toISOString();
    
    for (const [projId, project] of Object.entries(newWorkspace.projects)) {
      const oldProj = oldWorkspace.projects?.[projId] || {};
      
      const mapItem = (item, oldList, keyFn) => {
        const oldItem = (oldList || []).find(o => keyFn(o) === keyFn(item));
        return {
          ...item,
          addedAt: item.addedAt || oldItem?.addedAt || nowStr,
          warningSent: item.warningSent !== undefined ? item.warningSent : (oldItem?.warningSent !== undefined ? oldItem.warningSent : false)
        };
      };
      
      if (project.downloadedLigands) {
        project.downloadedLigands = project.downloadedLigands.map(l => mapItem(l, oldProj.downloadedLigands, x => String(x.cid)));
      }
      if (project.ligandFiles) {
        project.ligandFiles = project.ligandFiles.map(f => mapItem(f, oldProj.ligandFiles, x => String(x.key)));
      }
      if (project.downloadedProteins) {
        project.downloadedProteins = project.downloadedProteins.map(p => mapItem(p, oldProj.downloadedProteins, x => `${x.accession}_${x.format}`));
      }
      if (project.dockingJobs) {
        project.dockingJobs = project.dockingJobs.map(j => mapItem(j, oldProj.dockingJobs, x => String(x.name)));
      }
    }
    
    db.workspaces[req.session.userId] = newWorkspace;
    writeDB(db);
    
    // Notify customer support if new items added
    const totalAddedCount = newItems.downloadedLigands.length +
                            newItems.ligandFiles.length +
                            newItems.downloadedProteins.length +
                            newItems.dockingJobs.length;
                            
    if (totalAddedCount > 0) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.get('host') || 'localhost:5000';
      const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
      const user = getUserById(req.session.userId);
      const username = user ? user.username : "Unknown User";
      const email = user ? user.email : "N/A";
      
      try {
        await transporter.sendMail({
          from: `"ChemVault Workspace" <${EMAIL_USER}>`,
          to: "customersupport@spatialbiologics.com",
          subject: `📂 Data Added to Project — ${username}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
              <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:24px 32px">
                <h2 style="color:#fff;margin:0;font-size:20px">📂 Project Data Added</h2>
                <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px">ChemVault · Spatial Biologics</p>
              </div>
              <div style="padding:28px 32px;background:#fff">
                <p style="font-size:14px;color:#475569">User <strong>${username}</strong> (${email}) has added new files/data to their ChemVault workspace project.</p>
                <h4 style="color:#1e3a8a;margin-bottom:8px">Details of Added Items:</h4>
                <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:10px">
                  <thead>
                    <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0">
                      <th style="padding:8px;text-align:left;color:#475569">Project</th>
                      <th style="padding:8px;text-align:left;color:#475569">Type</th>
                      <th style="padding:8px;text-align:left;color:#475569">Item Identifier/Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${newItems.downloadedLigands.map(l => `
                      <tr style="border-bottom:1px solid #f1f5f9">
                        <td style="padding:8px;color:#1e293b">${l.projectId}</td>
                        <td style="padding:8px;color:#475569">Ligand (PubChem)</td>
                        <td style="padding:8px;color:#1e293b">CID ${l.cid} (${l.name || 'Unknown'})</td>
                      </tr>
                    `).join('')}
                    ${newItems.ligandFiles.map(f => `
                      <tr style="border-bottom:1px solid #f1f5f9">
                        <td style="padding:8px;color:#1e293b">${f.projectId}</td>
                        <td style="padding:8px;color:#475569">Ligand File</td>
                        <td style="padding:8px;color:#1e293b">${f.fileName || f.name} (${f.label} - ${f.type})</td>
                      </tr>
                    `).join('')}
                    ${newItems.downloadedProteins.map(p => `
                      <tr style="border-bottom:1px solid #f1f5f9">
                        <td style="padding:8px;color:#1e293b">${p.projectId}</td>
                        <td style="padding:8px;color:#475569">Protein</td>
                        <td style="padding:8px;color:#1e293b">${p.accession} (${p.format.toUpperCase()})</td>
                      </tr>
                    `).join('')}
                    ${newItems.dockingJobs.map(j => `
                      <tr style="border-bottom:1px solid #f1f5f9">
                        <td style="padding:8px;color:#1e293b">${j.projectId}</td>
                        <td style="padding:8px;color:#475569">Docking Job</td>
                        <td style="padding:8px;color:#1e293b">${j.name}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                <div style="margin-top:28px;text-align:center;border-top:1px solid #e2e8f0;padding-top:20px">
                  <p style="font-size:12px;color:#64748b;margin-bottom:12px">Use the option below if you need to clear all files saved by this user:</p>
                  <a href="${baseUrl}/api/admin/clear-workspace?userId=${req.session.userId}" 
                     style="background:#dc2626;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:13px;display:inline-block">
                    🗑️ Delete Workspace Data (Clear Files)
                  </a>
                </div>
              </div>
              <div style="background:#f8fafc;padding:16px 32px;font-size:12px;color:#94a3b8;text-align:center">
                Sent via ChemVault · Spatial Biologics
              </div>
            </div>
          `
        });
        console.log(`✅ Admin notified of new workspace data added by user: ${username}`);
      } catch (mailErr) {
        console.warn("⚠️ Admin workspace data notification failed:", mailErr.message);
      }
    }
    
    res.json({ success: true, workspace: newWorkspace });
  } catch (err) {
    console.error("Save workspace error:", err.message);
    res.status(500).json({ error: "Failed to save workspace" });
  }
});

app.get("/api/admin/clear-workspace", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).send("<h1>Error: Missing userId parameter</h1>");
    }

    const db = readDB();
    if (!db.workspaces) db.workspaces = {};

    const userObj = getUserById(userId);
    const username = userObj ? userObj.username : "Unknown User";

    db.workspaces[userId] = {
      activeProjectId: "SPB001",
      projects: {
        "SPB001": {
          downloadedLigands: [],
          ligandFiles: [],
          downloadedProteins: [],
          dockingJobs: []
        }
      }
    };
    writeDB(db);

    res.send(`
      <div style="font-family:Arial,sans-serif;text-align:center;padding:50px;max-width:500px;margin:50px auto;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
        <span style="font-size:48px">🗑️</span>
        <h2 style="color:#0f172a;margin-top:16px">Workspace Deleted Successfully</h2>
        <p style="color:#64748b;font-size:14px;line-height:1.6">
          All workspace projects and saved files for user <strong>${username}</strong> have been deleted from the database.
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:20px">
          The user account remains active, but all files in their projects have been cleared.
        </p>
      </div>
    `);
  } catch (err) {
    console.error("Admin clear workspace error:", err.message);
    res.status(500).send(`<h1>Failed to delete workspace: ${err.message}</h1>`);
  }
});

async function checkWorkspaceDataRetention() {
  console.log("⏰ Running data retention and warning check...");
  const db = readDB();
  if (!db.workspaces) return;

  let hasChanges = false;
  const now = new Date();

  for (const [userId, workspace] of Object.entries(db.workspaces)) {
    const user = getUserById(userId);
    if (!user) continue;

    for (const [projId, project] of Object.entries(workspace.projects || {})) {
      const fields = ["downloadedLigands", "ligandFiles", "downloadedProteins", "dockingJobs"];

      for (const field of fields) {
        if (!project[field]) continue;

        const originalLength = project[field].length;
        const updatedList = [];
        let warnUser = false;

        for (const item of project[field]) {
          if (!item.addedAt) {
            item.addedAt = now.toISOString();
            item.warningSent = false;
            updatedList.push(item);
            hasChanges = true;
            continue;
          }

          const addedTime = new Date(item.addedAt);
          const ageInMs = now - addedTime;
          const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

          if (ageInDays >= 15.0) {
            hasChanges = true;
            console.log(`🗑️ Deleting expired item in ${field} for user ${user.username} (age: ${ageInDays.toFixed(1)} days)`);
            continue;
          }

          if (ageInDays >= 12.0) {
            if (!item.warningSent) {
              warnUser = true;
              item.warningSent = true;
              hasChanges = true;
            }
          }

          updatedList.push(item);
        }

        if (updatedList.length !== originalLength) {
          project[field] = updatedList;
          hasChanges = true;
        }

        if (warnUser) {
          try {
            await transporter.sendMail({
              from: `"ChemVault Support" <${EMAIL_USER}>`,
              to: user.email,
              subject: "⚠️ Action Required: Your ChemVault data will be deleted in 3 days",
              html: `
                <div style="font-family:Arial,sans-serif;max-width:550px;margin:0 auto;border:1px solid #fecaca;border-radius:12px;overflow:hidden">
                  <div style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:24px 32px">
                    <h2 style="color:#fff;margin:0;font-size:20px">⚠️ Data Deletion Warning</h2>
                    <p style="color:#fee2e2;margin:6px 0 0;font-size:13px">ChemVault · Spatial Biologics</p>
                  </div>
                  <div style="padding:28px 32px;background:#fff">
                    <p style="font-size:15px;color:#1e293b;line-height:1.6">
                      Hello <strong>${user.username}</strong>,
                    </p>
                    <p style="font-size:14px;color:#475569;line-height:1.6">
                      This is an automated warning that some data in your project workspace <strong>${projId}</strong> has reached its retention limit of 12 days.
                    </p>
                    <div style="margin:20px 0;padding:16px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:6px;font-size:14px;color:#78350f;font-weight:600;line-height:1.6">
                      Your data will be deleted in three days (72 hours), so please save it in a local file if needed.
                    </div>
                    <p style="font-size:13px;color:#64748b;line-height:1.6">
                      To keep a copy of your files, you can use the download options provided in each module (SDF, FASTA, PDBQT, or Excel export) to save them to your local device.
                    </p>
                  </div>
                  <div style="background:#f8fafc;padding:16px 32px;font-size:12px;color:#94a3b8;text-align:center;border-top:1px solid #f1f5f9">
                    Sent via ChemVault · Spatial Biologics Data Retention System
                  </div>
                </div>
              `
            });
            console.log(`✉️ Sent deletion warning email to ${user.email} for project ${projId}`);
          } catch (mailErr) {
            console.error(`❌ Failed to send deletion warning email to ${user.email}:`, mailErr.message);
          }
        }
      }
    }
  }

  if (hasChanges) {
    writeDB(db);
  }
}

// Run checks every day (24 hours), and once on startup
setInterval(checkWorkspaceDataRetention, 24 * 60 * 60 * 1000);
setTimeout(checkWorkspaceDataRetention, 5000);

/* ========================= SMILES REPAIR ========================= */
app.post("/api/deeppk/repair", (req, res) => {
  const { smiles } = req.body;
  if (!smiles || typeof smiles !== "string")
    return res.status(400).json({ error: "No SMILES provided" });

  const results = smiles
    .split(/[\n,;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 2)
    .map(original => {
      let s = original.trim();
      const steps = [];

      // Step 1 — Fragment dot: keep largest fragment
      if (s.includes(".")) {
        const parts = s.split(".");
        const longest = parts.reduce((a, b) => (a.length >= b.length ? a : b));
        if (longest !== s) {
          steps.push(`Removed ${parts.length - 1} fragment(s) — kept largest`);
          s = longest;
        }
      }

      // Step 2 — Metal ions: [Mg2+], [Ca2+], [Zn2+], [Fe3+], etc.
      const metalRe = /\[(Mg|Ca|Zn|Fe|Cu|Mn|Co|Ni|Al|Li|Ba|Sr|Cs|Rb|Be|Ra|Tl|Pb|Bi|Mo|Se|Si|Ge|Sn|Sb|Te|W|V|Cr|Ti|Sc|Y|La|Ce|Pr|Nd|Sm|Eu|Gd|Tb|Dy|Ho|Er|Tm|Yb|Lu)\d*[+-]?\d*\]/g;
      const metalMatches = s.match(metalRe);
      if (metalMatches) {
        s = s.replace(metalRe, "").replace(/^\.+|\.+$/g, "").replace(/\.{2,}/g, ".").trim();
        steps.push(`Removed metal ion(s): ${metalMatches.join(", ")}`);
      }

      // Step 3 — Alkali/halide ions: [Na+], [K+], [Cl-], [Br-], [I-], [F-], [OH-], [NH4+], [H+]
      const ionRe = /\[(Na|K|Li|Cs|Rb|F|Cl|Br|I|OH|NH4|H)[+-]\d*\]/g;
      const ionMatches = s.match(ionRe);
      if (ionMatches) {
        s = s.replace(ionRe, "").replace(/^\.+|\.+$/g, "").replace(/\.{2,}/g, ".").trim();
        steps.push(`Removed ion(s): ${ionMatches.join(", ")}`);
      }

      // Step 4 — Stereo annotations @/@@
      if (s.includes("@")) {
        s = s.replace(/@@|@/g, "");
        steps.push("Removed stereo annotations (@/@@)");
      }

      // Step 5 — Simple bracket atoms → plain atoms
      const bracketMap = [
        [/\[CH3\]/g, "C"], [/\[CH2\]/g, "C"], [/\[CH\]/g, "C"], [/\[C\]/g, "C"],
        [/\[NH2\]/g, "N"], [/\[NH\]/g, "N"], [/\[N\]/g, "N"],
        [/\[OH\]/g, "O"], [/\[O\]/g, "O"],
        [/\[SH\]/g, "S"], [/\[S\]/g, "S"],
        [/\[PH2\]/g, "P"], [/\[PH\]/g, "P"],
      ];
      let bracketChanged = false;
      for (const [re, rep] of bracketMap) {
        if (re.test(s)) { s = s.replace(re, rep); bracketChanged = true; }
      }
      if (bracketChanged) steps.push("Simplified bracket atoms ([CH3]→C etc.)");

      // Step 6 — Cleanup leftover dots
      s = s.replace(/^\.+|\.+$/g, "").replace(/\.{2,}/g, ".").trim();

      // Step 7 — URL-encoded SMILES
      if (s.includes("%")) {
        try { s = decodeURIComponent(s); steps.push("Decoded URL encoding"); } catch (_) {}
      }

      // Step 8 — Unicode dashes / fancy quotes → ASCII
      s = s.replace(/[–—]/g, "-").replace(/[""'']/g, "");

      return {
        original,
        repaired: s,
        changed: s !== original,
        steps,
        note: steps.length > 0 ? steps.join("; ") : "No changes needed",
      };
    });

  res.json({ results });
});

/* ========================= BULK UPLOAD & REPAIR ========================= */
const uploadMemory = multer({ storage: multer.memoryStorage() });

function convert3DToSmiles(buffer, ext) {
  return new Promise((resolve) => {
    let format = ext.replace(".", "").toLowerCase();
    let tempExt = ext;
    if (format === "molto") {
      format = "mol2";
      tempExt = ".mol2";
    }
    
    // Create a temporary file name
    const tempDir = path.join(__dirname, "temp_parsing");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempInFile = path.join(tempDir, `temp_input_${Date.now()}_${Math.random().toString(36).substring(7)}${tempExt}`);
    
    // Write buffer to temp file
    try {
      fs.writeFileSync(tempInFile, buffer);
    } catch (writeErr) {
      console.error("Failed to write temporary file for OpenBabel:", writeErr.message);
      return resolve([]);
    }
    
    // Setup obabel PATH env variable
    const env = { ...process.env };
    env.PATH = (env.PATH || "") + ";C:\\Program Files\\OpenBabel-3.1.1;C:\\Program Files\\OpenBabel-3.1.0";

    const cmd = `obabel -i${format} "${tempInFile}" -osmi`;
    exec(cmd, { env }, (err, stdout, stderr) => {
      // Clean up the temp file
      try {
        if (fs.existsSync(tempInFile)) {
          fs.unlinkSync(tempInFile);
        }
      } catch (_) {}

      if (err) {
        console.warn("OpenBabel conversion failed for extension", ext, ":", err.message, stderr);
        return resolve([]); // return empty array on failure, don't crash
      }

      // Parse smiles from stdout
      const lines = stdout.split(/[\r\n]+/);
      const smilesList = lines
        .map(line => {
          const parts = line.trim().split(/\s+/);
          return parts[0] ? parts[0].trim() : "";
        })
        .filter(s => s.length > 2);

      resolve(smilesList);
    });
  });
}

app.post("/api/deeppk/upload-bulk", uploadMemory.array("files"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    let allSmiles = [];

    // Helper to repair a single smiles string (reusing your existing repair logic)
    const repairSmiles = (original) => {
      let s = original.trim();
      const steps = [];

      // Step 1 — Fragment dot
      if (s.includes(".")) {
        const parts = s.split(".");
        const longest = parts.reduce((a, b) => (a.length >= b.length ? a : b));
        if (longest !== s) {
          steps.push(`Removed ${parts.length - 1} fragment(s) — kept largest`);
          s = longest;
        }
      }

      // Step 2 — Metal ions
      const metalRe = /\[(Mg|Ca|Zn|Fe|Cu|Mn|Co|Ni|Al|Li|Ba|Sr|Cs|Rb|Be|Ra|Tl|Pb|Bi|Mo|Se|Si|Ge|Sn|Sb|Te|W|V|Cr|Ti|Sc|Y|La|Ce|Pr|Nd|Sm|Eu|Gd|Tb|Dy|Ho|Er|Tm|Yb|Lu)\d*[+-]?\d*\]/g;
      const metalMatches = s.match(metalRe);
      if (metalMatches) {
        s = s.replace(metalRe, "").replace(/^\.+|\.+$/g, "").replace(/\.{2,}/g, ".").trim();
        steps.push(`Removed metal ion(s): ${metalMatches.join(", ")}`);
      }

      // Step 3 — Alkali/halide ions
      const ionRe = /\[(Na|K|Li|Cs|Rb|F|Cl|Br|I|OH|NH4|H)[+-]\d*\]/g;
      const ionMatches = s.match(ionRe);
      if (ionMatches) {
        s = s.replace(ionRe, "").replace(/^\.+|\.+$/g, "").replace(/\.{2,}/g, ".").trim();
        steps.push(`Removed ion(s): ${ionMatches.join(", ")}`);
      }

      // Step 4 — Stereo annotations @/@@
      if (s.includes("@")) {
        s = s.replace(/@@|@/g, "");
        steps.push("Removed stereo annotations (@/@@)");
      }

      // Step 5 — Simple bracket atoms → plain atoms
      const bracketMap = [
        [/\[CH3\]/g, "C"], [/\[CH2\]/g, "C"], [/\[CH\]/g, "C"], [/\[C\]/g, "C"],
        [/\[NH2\]/g, "N"], [/\[NH\]/g, "N"], [/\[N\]/g, "N"],
        [/\[OH\]/g, "O"], [/\[O\]/g, "O"],
        [/\[SH\]/g, "S"], [/\[S\]/g, "S"],
        [/\[PH2\]/g, "P"], [/\[PH\]/g, "P"],
      ];
      let bracketChanged = false;
      for (const [re, rep] of bracketMap) {
        if (re.test(s)) { s = s.replace(re, rep); bracketChanged = true; }
      }
      if (bracketChanged) steps.push("Simplified bracket atoms ([CH3]→C etc.)");

      // Step 6 — Cleanup leftover dots
      s = s.replace(/^\.+|\.+$/g, "").replace(/\.{2,}/g, ".").trim();

      // Step 7 — URL-encoded SMILES
      if (s.includes("%")) {
        try { s = decodeURIComponent(s); steps.push("Decoded URL encoding"); } catch (_) {}
      }

      // Step 8 — Unicode dashes / fancy quotes
      s = s.replace(/[–—]/g, "-").replace(/[""'']/g, "");

      return {
        original,
        repaired: s,
        changed: s !== original,
        steps,
        note: steps.length > 0 ? steps.join("; ") : "No changes needed"
      };
    };

    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (ext === ".xlsx" || ext === ".xls") {
        // Excel file parsing
        try {
          const workbook = XLSX.read(file.buffer, { type: "buffer" });
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            
            if (rows.length === 0) continue;

            let smilesColIdx = -1;
            const headerRow = rows[0];
            if (Array.isArray(headerRow)) {
              smilesColIdx = headerRow.findIndex(cell => {
                const str = String(cell || "").toLowerCase().trim();
                return ["smiles", "smiles_string", "structure", "formula", "compound", "mol", "molecule"].includes(str);
              });
            }

            for (let r = 1; r < rows.length; r++) {
              const row = rows[r];
              if (!Array.isArray(row)) continue;

              let candidateSmiles = "";
              if (smilesColIdx !== -1) {
                candidateSmiles = String(row[smilesColIdx] || "").trim();
              } else {
                for (const cell of row) {
                  const str = String(cell || "").trim();
                  if (str.length > 2 && !str.includes(" ") && (str.includes("=") || str.includes("C") || str.includes("c") || str.includes("("))) {
                    candidateSmiles = str;
                    break;
                  }
                }
              }

              if (candidateSmiles.length > 2) {
                allSmiles.push(candidateSmiles);
              }
            }
          }
        } catch (excelErr) {
          console.error("Excel parsing failed for file:", file.originalname, excelErr.message);
        }
      } else if (ext === ".sdf" || ext === ".mol" || ext === ".mol2" || ext === ".molto" || ext === ".pdb") {
        // 3D structure formats (OpenBabel conversion)
        try {
          const converted = await convert3DToSmiles(file.buffer, ext);
          if (converted && converted.length > 0) {
            allSmiles.push(...converted);
          }
        } catch (obErr) {
          console.error("OpenBabel conversion failed for file:", file.originalname, obErr.message);
        }
      } else {
        // Text-based files (txt, csv, smi, smiles, tsv)
        const content = file.buffer.toString("utf-8");
        const lines = content.split(/[\r\n]+/);
        
        for (let line of lines) {
          line = line.trim();
          if (line.length <= 2) continue;

          if (line.includes(",") || line.includes("\t")) {
            const parts = line.split(/[,\t]+/);
            const smilesPart = parts.find(p => {
              const str = p.trim();
              return str.length > 2 && !str.includes(" ") && (str.includes("=") || str.includes("C") || str.includes("c") || str.includes("("));
            });
            if (smilesPart) {
              allSmiles.push(smilesPart.trim());
            }
          } else {
            allSmiles.push(line);
          }
        }
      }
    }

    // Deduplicate and filter empty SMILES
    const uniqueSmiles = [...new Set(allSmiles)].map(s => s.trim()).filter(s => s.length > 2);

    if (uniqueSmiles.length === 0) {
      return res.status(400).json({ error: "No valid chemical structures or SMILES strings found in the uploaded files" });
    }

    // Run repair logic on all extracted SMILES
    const repairedList = uniqueSmiles.map(repairSmiles);

    return res.json({
      success: true,
      results: repairedList
    });
  } catch (err) {
    console.error("Bulk upload processing error:", err.message);
    return res.status(500).json({ error: "Failed to process bulk upload: " + err.message });
  }
});
/* ========================= END SMILES REPAIR ========================= */

/* ========================= DOCKING SETUP ========================= */
const DOCKING_BASE = path.join(__dirname);
const PROTEINS_DIR = path.join(DOCKING_BASE, "proteins");
const LIGANDS_DIR  = path.join(DOCKING_BASE, "ligands");
const RESULTS_DIR  = path.join(DOCKING_BASE, "results");

[PROTEINS_DIR, LIGANDS_DIR, RESULTS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const dockingProteinStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PROTEINS_DIR),
  filename:    (req, file, cb) => cb(null, file.originalname),
});
const dockingLigandStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, LIGANDS_DIR),
  filename:    (req, file, cb) => cb(null, file.originalname),
});
const uploadDockingProtein = multer({ storage: dockingProteinStorage });
const uploadDockingLigand  = multer({ storage: dockingLigandStorage });

app.get("/api/docking/proteins", (req, res) => {
  const pdbqt = fs.existsSync(RESULTS_DIR)
    ? fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith(".pdbqt") && !f.includes("_out")) : [];
  const pdb = fs.existsSync(PROTEINS_DIR)
    ? fs.readdirSync(PROTEINS_DIR).filter(f => f.endsWith(".pdb") && !f.includes("_fixed")) : [];
  res.json({ pdbqt, pdb });
});

app.get("/api/docking/ligands", (req, res) => {
  const pdbqt = fs.existsSync(RESULTS_DIR)
    ? fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith(".pdbqt") && !f.includes("_out")) : [];
  const sdf = fs.existsSync(LIGANDS_DIR)
    ? fs.readdirSync(LIGANDS_DIR).filter(f => f.endsWith(".sdf") && !f.includes("_fixed")) : [];
  res.json({ pdbqt, sdf });
});

app.post("/api/docking/upload/protein", uploadDockingProtein.single("protein"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  console.log(`✅ Protein uploaded: ${req.file.originalname}`);
  res.json({ success: true, filename: req.file.originalname });
});

app.post("/api/docking/upload/ligand", uploadDockingLigand.single("ligand"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  console.log(`✅ Ligand uploaded: ${req.file.originalname}`);
  res.json({ success: true, filename: req.file.originalname });
});

function streamPython(scriptName, res, startMsg) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = msg => res.write(`data: ${msg}\n\n`);
  send(startMsg);
  const scriptPath = path.join(DOCKING_BASE, scriptName);
  const env = {
    ...process.env,
    PATH: process.env.PATH + ";C:\\Program Files\\OpenBabel-3.1.1",
    PYTHONUNBUFFERED: "1",
  };
  const proc = spawn("python", ["-u", scriptPath], { cwd: DOCKING_BASE, env });
  let stdoutBuf = "", stderrBuf = "";
  proc.stdout.on("data", chunk => {
    stdoutBuf += chunk.toString();
    const lines = stdoutBuf.split("\n"); stdoutBuf = lines.pop();
    lines.forEach(l => l.trim() && send(l.trim()));
  });
  proc.stderr.on("data", chunk => {
    stderrBuf += chunk.toString();
    const lines = stderrBuf.split("\n"); stderrBuf = lines.pop();
    lines.forEach(l => l.trim() && send(`⚠️ ${l.trim()}`));
  });
  proc.on("close", code => {
    if (stdoutBuf.trim()) send(stdoutBuf.trim());
    if (stderrBuf.trim()) send(`⚠️ ${stderrBuf.trim()}`);
    send(code === 0 ? "✅ Done!" : `❌ Failed (exit code ${code})`);
    res.end();
  });
  proc.on("error", err => { send(`❌ Spawn error: ${err.message}`); res.end(); });
}

app.post("/api/docking/prepare/protein", (req, res) =>
  streamPython("protein_preparation.py", res, "🔬 Starting protein preparation...")
);
app.post("/api/docking/prepare/ligand", (req, res) =>
  streamPython("ligand_preparation.py", res, "💊 Starting ligand preparation...")
);
app.post("/api/docking/convert", (req, res) =>
  streamPython("convert_to_pdbqt.py", res, "🔄 Converting files to PDBQT...")
);
app.post("/api/docking/run", (req, res) => {
  const { mode } = req.body;
  const script = mode === "blind" ? "blind_docking_script.py" : "docking_script.py";
  streamPython(script, res, `🚀 Starting ${mode === "blind" ? "Blind" : "Active Site"} Docking...`);
});

app.get("/api/docking/results", (req, res) => {
  if (!fs.existsSync(RESULTS_DIR)) return res.json([]);
  const allFiles     = fs.readdirSync(RESULTS_DIR);
  const outFiles     = allFiles.filter(f => f.endsWith("_out.pdbqt"));
  const logFiles     = allFiles.filter(f => f.endsWith(".log"));
  const results      = [];
  const handledNames = new Set();

  for (const outFile of outFiles) {
    const name        = outFile.replace("_out.pdbqt", "");
    const outFilePath = path.join(RESULTS_DIR, outFile);
    const logFile     = name + ".log";
    const modes       = [];
    handledNames.add(name);
    try {
      const lines = fs.readFileSync(outFilePath, "utf8").split("\n");
      let modelNum = 0;
      for (const line of lines) {
        if (line.trim().startsWith("MODEL")) modelNum++;
        if (line.includes("VINA RESULT:")) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 6)
            modes.push({ mode: String(modelNum), affinity: parts[3], rmsdLB: parts[4], rmsdUB: parts[5] });
        }
      }
    } catch {}
    if (!modes.length) {
      const logPath = path.join(RESULTS_DIR, logFile);
      if (fs.existsSync(logPath)) {
        try {
          let capture = false;
          for (const line of fs.readFileSync(logPath, "utf8").split("\n")) {
            if (line.trim().startsWith("mode")) { capture = true; continue; }
            if (capture) {
              const parts = line.trim().split(/\s+/);
              if (parts.length >= 4 && /^\d+$/.test(parts[0]))
                modes.push({ mode: parts[0], affinity: parts[1], rmsdLB: parts[2], rmsdUB: parts[3] });
            }
          }
        } catch {}
      }
    }
    results.push({ name, log: logFile, outFile, modes });
  }

  for (const logFile of logFiles) {
    const name = logFile.replace(".log", "");
    if (handledNames.has(name)) continue;
    const modes = [];
    try {
      let capture = false;
      for (const line of fs.readFileSync(path.join(RESULTS_DIR, logFile), "utf8").split("\n")) {
        if (line.trim().startsWith("mode")) { capture = true; continue; }
        if (capture) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4 && /^\d+$/.test(parts[0]))
            modes.push({ mode: parts[0], affinity: parts[1], rmsdLB: parts[2], rmsdUB: parts[3] });
        }
      }
    } catch {}
    results.push({ name, log: logFile, outFile: name + "_out.pdbqt", modes });
  }

  console.log(`Returning ${results.length} docking results`);
  res.json(results);
});

app.get("/api/docking/download/:filename", (req, res) => {
  const filePath = path.join(RESULTS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
  res.download(filePath);
});

console.log("✅ Docking routes loaded");

/* ========================= START ========================= */
app.listen(PORT, () => {
  console.log(`\n✅ ChemVault running on http://localhost:${PORT}\n`);
}); 