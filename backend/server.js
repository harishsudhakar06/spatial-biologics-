const express = require("express");
const cors = require("cors");
const axios = require("axios");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");

const app = express();
const PORT = 5000;
const USERS_FILE = "./users.json";
const CACHE_FILE = "./compounds_cache.json";

// ── Cache ─────────────────────────────────────────────────────
let compoundCache = {};
if (fs.existsSync(CACHE_FILE)) {
  try { compoundCache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")); }
  catch { compoundCache = {}; }
}

function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(compoundCache, null, 2));
}

function getCached(cid) {
  const entry = compoundCache[String(cid)];
  if (!entry) return null;
  const age = Date.now() - entry.cachedAt;
  if (age > 7 * 24 * 3600 * 1000) return null;
  return entry.data;
}

function setCache(cid, data) {
  compoundCache[String(cid)] = { data, cachedAt: Date.now() };
  saveCache();
}

function getCacheCount() {
  return Object.keys(compoundCache).length;
}

// ── Users ─────────────────────────────────────────────────────
let users = [];
if (fs.existsSync(USERS_FILE)) {
  try { users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8")); }
  catch { users = []; }
}

function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

app.use(express.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(
  session({
    secret: "chem_secret_key_2024",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 7 * 24 * 3600000 },
  })
);

// ── AUTH ──────────────────────────────────────────────────────
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields required" });
  if (users.find((u) => u.email === email))
    return res.status(400).json({ error: "Email already registered" });
  const hashed = await bcrypt.hash(password, 10);
  users.push({ name, email, password: hashed });
  saveUsers();
  res.json({ message: "Registered successfully" });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: "Invalid credentials" });
  req.session.user = { name: user.name, email: user.email };
  res.json({ message: "Login successful", user: req.session.user });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "Logged out" });
});

app.get("/api/me", (req, res) => {
  if (req.session.user) return res.json({ user: req.session.user });
  res.status(401).json({ error: "Not authenticated" });
});

// ── FETCH ONE COMPOUND FROM PUBCHEM ───────────────────────────
async function fetchCompound(cid, q) {
  // check cache
  const cached = getCached(cid);
  if (cached) {
    console.log("Cache hit:", cid);
    return cached;
  }

  // properties
  const propRes = await axios.get(
    "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" + cid +
    "/property/IUPACName,MolecularFormula,MolecularWeight,InChIKey,InChI,XLogP,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,ExactMass,TPSA/JSON",
    { timeout: 8000 }
  );
  const prop = propRes.data.PropertyTable?.Properties?.[0];
  if (!prop) throw new Error("No data for CID " + cid);

  // SMILES
  let smiles = "N/A";
  try {
    const r = await axios.get(
      "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" + cid + "/property/IsomericSMILES/TXT",
      { timeout: 6000 }
    );
    const raw = r.data?.trim();
    if (raw && raw.length > 3) smiles = raw;
  } catch {
    try {
      const r2 = await axios.get(
        "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" + cid + "/property/CanonicalSMILES/TXT",
        { timeout: 6000 }
      );
      const raw2 = r2.data?.trim();
      if (raw2 && raw2.length > 3) smiles = raw2;
    } catch {}
  }

  // synonyms
  let synonyms = [];
  try {
    const synRes = await axios.get(
      "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" + cid + "/synonyms/JSON",
      { timeout: 5000 }
    );
    synonyms = synRes.data.InformationList?.Information?.[0]?.Synonym?.slice(0, 8) || [];
  } catch {}

  // descriptions
  let description = "";
  let allDescriptions = [];
  try {
    const descRes = await axios.get(
      "https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/" + cid + "/JSON?heading=Description",
      { timeout: 8000 }
    );
    const sections = descRes.data?.Record?.Section;
    if (sections) {
      for (const sec of sections) {
        if (sec?.Information) {
          for (const info of sec.Information) {
            const text = info?.Value?.StringWithMarkup?.[0]?.String;
            const source = info?.Reference?.[0] || "";
            if (text && text.length > 30) {
              allDescriptions.push({ text, source });
              if (!description) description = text;
            }
          }
        }
      }
    }
  } catch {}

  // create date
  let createDate = "";
  try {
    const dateRes = await axios.get(
      "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" + cid + "/dates/JSON",
      { timeout: 5000 }
    );
    const d = dateRes.data?.InformationList?.Information?.[0]?.CreationDate;
    if (d?.Year) {
      createDate = d.Year + "-" + String(d.Month).padStart(2,"0") + "-" + String(d.Day).padStart(2,"0");
    }
  } catch {}

  // 3D check
  let has3D = false;
  try {
    await axios.get(
      "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" + cid + "/record/SDF?record_type=3d",
      { timeout: 3000 }
    );
    has3D = true;
  } catch {}

  const data = {
    cid,
    name: prop.IUPACName || q || "CID " + cid,
    formula: prop.MolecularFormula || "N/A",
    weight: prop.MolecularWeight || "N/A",
    inchikey: prop.InChIKey || "N/A",
    inchi: prop.InChI || "",
    smiles,
    xlogp: prop.XLogP ?? "N/A",
    hbondDonor: prop.HBondDonorCount ?? "N/A",
    hbondAcceptor: prop.HBondAcceptorCount ?? "N/A",
    rotatableBonds: prop.RotatableBondCount ?? "N/A",
    exactMass: prop.ExactMass || "N/A",
    tpsa: prop.TPSA || "N/A",
    createDate,
    synonyms,
    description,
    allDescriptions,
    has2D: true,
    has3D,
    hasCrystal: true,
    source: "PubChem",
    image2D: "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" + cid + "/PNG",
  };

  setCache(cid, data);
  return data;
}

// ── GET CIDs BY NAME FROM PUBCHEM ─────────────────────────────
async function getCidsByName(q) {
  let cids = [];
  let bestCid = null;

  // exact name
  try {
    const r = await axios.get(
      "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/" +
      encodeURIComponent(q) + "/cids/JSON",
      { timeout: 8000 }
    );
    const list = r.data.IdentifierList?.CID || [];
    bestCid = list[0] || null;
    cids = [...list];
  } catch {}

  // complete match
  try {
    const r = await axios.get(
      "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/" +
      encodeURIComponent(q) + "/cids/JSON?name_type=complete",
      { timeout: 8000 }
    );
    cids = [...cids, ...(r.data.IdentifierList?.CID || [])];
  } catch {}

  // word match
  try {
    const r = await axios.get(
      "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/" +
      encodeURIComponent(q) + "/cids/JSON?name_type=word",
      { timeout: 8000 }
    );
    cids = [...cids, ...(r.data.IdentifierList?.CID || [])];
  } catch {}

  if (bestCid) cids = [bestCid, ...cids.filter(c => c !== bestCid)];
  return [...new Set(cids)].slice(0, 5);
}

// ── MAIN SEARCH (name OR CID) ─────────────────────────────────
app.get("/api/search", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Please login first" });

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Query required" });

  const trimmed = q.trim();
  const isCID = /^\d+$/.test(trimmed);

  try {
    let cids = [];

    if (isCID) {
      // search by CID directly
      const cidNum = parseInt(trimmed);
      console.log("Searching by CID:", cidNum);
      try {
        // verify it exists on PubChem
        const verifyRes = await axios.get(
          "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" +
          cidNum + "/property/IUPACName/JSON",
          { timeout: 8000 }
        );
        if (verifyRes.data.PropertyTable?.Properties?.[0]) {
          cids = [cidNum];
        } else {
          return res.status(404).json({ error: "No PubChem compound found for CID " + cidNum });
        }
      } catch {
        return res.status(404).json({ error: "No PubChem compound found for CID " + cidNum });
      }
    } else {
      // search by name
      console.log("Searching by name:", trimmed);
      cids = await getCidsByName(trimmed);
      if (cids.length === 0) {
        return res.json({ best: null, results: [] });
      }
    }

    // fetch all compounds
    const allData = await Promise.all(
      cids.map(async (cid) => {
        try { return await fetchCompound(cid, trimmed); }
        catch { return null; }
      })
    );

    const filtered = allData.filter(Boolean);
    if (filtered.length === 0) {
      return res.json({ best: null, results: [] });
    }

    res.json({ best: filtered[0], results: filtered.slice(1) });

  } catch (err) {
    console.error("Search error:", err.message);
    res.status(500).json({ error: "Search failed. Please try again." });
  }
});

// ── SIMILAR ───────────────────────────────────────────────────
app.get("/api/similar/:cid", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Not authenticated" });
  const { cid } = req.params;
  try {
    const simRes = await axios.get(
      "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsimilarity_2d/cid/" +
      cid + "/cids/JSON?Threshold=90",
      { timeout: 10000 }
    );
    const cids = simRes.data.IdentifierList?.CID?.slice(0, 5) || [];
    const results = await Promise.all(
      cids.map(async (c) => {
        try {
          const cached = getCached(c);
          if (cached) return cached;
          const propRes = await axios.get(
            "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" + c +
            "/property/IUPACName,MolecularFormula,MolecularWeight,InChIKey/JSON",
            { timeout: 5000 }
          );
          const prop = propRes.data.PropertyTable?.Properties?.[0];
          return {
            cid: c,
            name: prop?.IUPACName || "CID " + c,
            formula: prop?.MolecularFormula || "N/A",
            weight: prop?.MolecularWeight || "N/A",
            inchikey: prop?.InChIKey || "N/A",
            image2D: "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" + c + "/PNG",
          };
        } catch { return null; }
      })
    );
    res.json({ results: results.filter(Boolean) });
  } catch {
    res.json({ results: [] });
  }
});

// ── SUMMARY ───────────────────────────────────────────────────
app.get("/api/summary/:cid", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Not authenticated" });
  const { cid } = req.params;
  try {
    const data = await fetchCompound(cid, "");
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// ── STRUCTURE ─────────────────────────────────────────────────
app.get("/api/structure/:cid/:type", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Not authenticated" });
  const { cid, type } = req.params;
  try {
    if (type === "2d") {
      return res.json({
        type: "2d",
        imageUrl: "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" +
          cid + "/PNG?image_size=500x500",
        cid,
      });
    }
    if (type === "3d") {
      return res.json({
        type: "3d",
        embedUrl: "https://embed.molview.org/v1/?mode=balls&cid=" + cid,
        cid,
      });
    }
    if (type === "crystal") {
      return res.json({
        type: "crystal",
        embedUrl: "https://embed.molview.org/v1/?mode=wireframe&cid=" + cid,
        cid,
      });
    }
    res.status(400).json({ error: "Invalid type" });
  } catch {
    res.status(500).json({ error: "Structure data not available" });
  }
});

// ── CACHE STATS ───────────────────────────────────────────────
app.get("/api/cache-stats", (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Not authenticated" });
  res.json({ cachedCompounds: getCacheCount() });
});

app.listen(PORT, () =>
  console.log("Server running on http://localhost:" + PORT)
);