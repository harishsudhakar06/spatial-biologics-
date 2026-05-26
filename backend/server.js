// ================================================
// ChemVault Backend Server - FINAL PRODUCTION VERSION
// ~620 lines | Robust SDF Cleaner + All Fixes
// ================================================

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const dns = require("dns");
const { execSync } = require("child_process");

dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 5000;
const USERS_FILE = path.join(__dirname, "users.json");

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]");
  console.log("✅ Created new users.json file");
}

app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(
  session({
    secret: "chemvault_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

const CACHE = new Map();

console.log("🔧 ChemVault Backend Initializing...");

// ====================== USER MANAGEMENT ======================
function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch (e) {
    console.error("❌ Error reading users:", e.message);
    return [];
  }
}

function writeUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error("❌ Error writing users:", e.message);
  }
}

// ====================== PUBCHEM HELPERS ======================
function curlJSON(url) {
  try {
    const output = execSync(
      `curl -4 -L -s --connect-timeout 15 --max-time 30 "${url}"`,
      { encoding: "utf8", shell: "/bin/bash", maxBuffer: 1024 * 1024 * 50 }
    );
    return JSON.parse(output);
  } catch (err) {
    console.log(`⚠️  PUBCHEM JSON ERROR: ${err.message}`);
    return null;
  }
}

function curlText(url) {
  try {
    return execSync(
      `curl -4 -L -s --connect-timeout 15 --max-time 30 "${url}"`,
      { encoding: "utf8", shell: "/bin/bash", maxBuffer: 1024 * 1024 * 50 }
    );
  } catch (err) {
    console.log(`⚠️  PUBCHEM TEXT ERROR: ${err.message}`);
    return "";
  }
}

function normalizeCompound(prop, cid) {
  return {
    cid: Number(cid),
    name: prop.IUPACName || "Unknown Compound",
    formula: prop.MolecularFormula || "N/A",
    weight: prop.MolecularWeight || "N/A",
    inchikey: prop.InChIKey || "N/A",
    inchi: prop.InChI || "N/A",
    xlogp: prop.XLogP || "N/A",
    hbondDonor: prop.HBondDonorCount || "N/A",
    hbondAcceptor: prop.HBondAcceptorCount || "N/A",
    rotatableBonds: prop.RotatableBondCount || "N/A",
    exactMass: prop.ExactMass || "N/A",
    tpsa: prop.TPSA || "N/A",
    image2D: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=500x500`,
    has2D: true,
    has3D: true,
    hasCrystal: true,
  };
}

async function fetchCompound(cid) {
  try {
    console.log(`🔍 Fetching compound: CID ${cid}`);

    if (CACHE.has(`compound_${cid}`)) {
      console.log(`✅ Cache hit for CID ${cid}`);
      return CACHE.get(`compound_${cid}`);
    }

    const propertyURL =
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/` +
      `IUPACName,MolecularFormula,MolecularWeight,CanonicalSMILES,IsomericSMILES,` +
      `InChIKey,InChI,XLogP,HBondDonorCount,HBondAcceptorCount,` +
      `RotatableBondCount,ExactMass,TPSA/JSON`;

    const data = curlJSON(propertyURL);
    if (!data?.PropertyTable?.Properties?.length) return null;

    const prop = data.PropertyTable.Properties[0];

    let smiles = prop.IsomericSMILES || prop.CanonicalSMILES || null;
    if (!smiles) {
      try {
        const sdfURL = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF`;
        const sdfText = curlText(sdfURL);
        const smilesMatch = sdfText.match(/> <PUBCHEM_SMILES>\s*[\r\n]+([^\r\n]+)/);
        if (smilesMatch && smilesMatch[1]) smiles = smilesMatch[1].trim();
      } catch (e) {}
    }
    if (!smiles) smiles = "Not Available";

    const synonymURL = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`;
    const synonymData = curlJSON(synonymURL);
    const synonyms = synonymData?.InformationList?.Information?.[0]?.Synonym?.slice(0, 15) || [];

    const preferredName =
      synonyms.find(s => s.length < 40 && !s.includes("=") && !s.includes("[") && !s.includes("InChI")) ||
      prop.IUPACName ||
      "Unknown Compound";

    const compound = {
      ...normalizeCompound(prop, cid),
      name: preferredName,
      smiles,
      synonyms,
      description: `${preferredName} is a chemical compound available in the PubChem database.`,
      allDescriptions: [{ text: `${preferredName} is a chemical compound available in the PubChem database.`, source: "PubChem" }],
      createDate: new Date().toISOString().split("T")[0],
    };

    CACHE.set(`compound_${cid}`, compound);
    console.log(`✅ Cached: ${preferredName} (CID ${cid})`);
    return compound;
  } catch (err) {
    console.log(`❌ Fetch error CID ${cid}:`, err.message);
    return null;
  }
}

// ====================== ROBUST DISPLAY ROUTE ======================
app.get("/api/display/:cid/:format", async (req, res) => {
  try {
    const { cid, format } = req.params;
    console.log(`📄 Display request: CID ${cid} | Format: ${format}`);

    const allowed = ["sdf", "json", "xml", "asnt"];
    if (!allowed.includes(format.toLowerCase())) {
      return res.status(400).send("Invalid format");
    }

    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/${format.toUpperCase()}`;
    let data = curlText(url);

    // ROBUST SDF CLEANER - Handles \r\n and cuts everything after M END
    if (format.toLowerCase() === "sdf") {
      // Normalize line endings
      data = data.replace(/\r\n/g, "\n");
      // Find M END and keep only molecule block
      const endIndex = data.indexOf("M  END");
      if (endIndex !== -1) {
        data = data.substring(0, endIndex + 6) + "\n";
      }
    }

    res.setHeader("Content-Type", "text/plain");
    res.send(data);
    console.log(`✅ Delivered clean ${format.toUpperCase()} for CID ${cid}`);
  } catch (err) {
    console.error(`❌ Display error:`, err.message);
    res.status(500).send("Failed to load file");
  }
});

// ====================== FULL AUTH ROUTES ======================
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const users = readUsers();
    const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now(),
      name,
      email: email.toLowerCase(),
      password: hashed,
    };

    users.push(newUser);
    writeUsers(users);

    console.log(`✅ New user registered: ${name} (${email})`);
    res.json({ success: true });
  } catch (err) {
    console.log("REGISTER ERROR:", err.message);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = readUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    console.log(`✅ User logged in: ${user.name} (${user.email})`);
    res.json({ user: req.session.user });
  } catch (err) {
    console.log("LOGIN ERROR:", err.message);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    console.log("👋 User logged out");
    res.json({ success: true });
  });
});

app.get("/api/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ user: req.session.user });
});

// ====================== SEARCH ROUTE ======================
app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.status(400).json({ error: "Query required" });

    console.log(`🔎 Searching PubChem: "${q}"`);

    if (/^\d+$/.test(q)) {
      const cid = Number(q);
      console.log(`🔢 Direct CID search: ${cid}`);
      const compound = await fetchCompound(cid);
      if (!compound) {
        return res.json({ best: null, results: [], totalResults: 0 });
      }
      return res.json({
        best: compound,
        results: [],
        totalResults: 1,
      });
    }

    let cids = [];
    const searchURL = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(q)}/cids/JSON`;
    const searchData = curlJSON(searchURL);
    cids = searchData?.IdentifierList?.CID || [];

    console.log(`📊 CIDS FOUND: [${cids.join(", ")}]`);

    if (!cids.length) {
      return res.json({ best: null, results: [], totalResults: 0 });
    }

    cids = [...new Set(cids)].slice(0, 8);
    const fetched = await Promise.all(cids.map(cid => fetchCompound(cid)));
    let filtered = fetched.filter(Boolean);

    if (!filtered.length) {
      return res.json({ best: null, results: [], totalResults: 0 });
    }

    let extraResults = [];
    try {
      const bestCid = filtered[0].cid;
      const simURL = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsimilarity_2d/cid/${bestCid}/cids/JSON?Threshold=85&MaxRecords=12`;
      const simData = curlJSON(simURL);

      let simCids = [...new Set(simData?.IdentifierList?.CID || [])]
        .filter(c => c !== bestCid);

      if (simCids.length < 5) {
        const fallback = cids.filter(c => c !== bestCid && !simCids.includes(c));
        simCids = [...simCids, ...fallback];
      }

      simCids = simCids.slice(0, 6);
      const extraFetched = await Promise.all(simCids.map(cid => fetchCompound(cid)));
      extraResults = extraFetched.filter(Boolean).slice(0, 6);
    } catch (e) {
      console.log("⚠️ Similarity error:", e.message);
    }

    let all = [...filtered, ...extraResults]
      .filter((v, i, a) => a.findIndex(x => x.cid === v.cid) === i);

    if (all.length < 6) {
      const needed = 6 - all.length;
      const extraPool = cids.filter(cid => !all.some(x => x.cid === cid));
      for (const cid of extraPool.slice(0, needed)) {
        const compound = await fetchCompound(cid);
        if (compound) all.push(compound);
      }
    }

    res.json({
      best: all[0],
      results: all.slice(1, 6),
      totalResults: all.length,
    });
  } catch (err) {
    console.error("❌ Search error:", err.message);
    res.status(500).json({ error: "Search failed" });
  }
});

app.get("/api/summary/:cid", async (req, res) => {
  const compound = await fetchCompound(req.params.cid);
  if (!compound) return res.status(404).json({ error: "Compound not found" });
  res.json(compound);
});

app.get("/api/similar/:cid", async (req, res) => {
  try {
    const cid = req.params.cid;
    const simURL = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsimilarity_2d/cid/${cid}/cids/JSON?Threshold=85&MaxRecords=8`;
    const simData = curlJSON(simURL);
    const cids = [...new Set(simData?.IdentifierList?.CID || [])]
      .filter(c => String(c) !== String(cid))
      .slice(0, 6);

    const results = await Promise.all(cids.map(id => fetchCompound(id)));
    res.json({ results: results.filter(Boolean) });
  } catch (err) {
    res.status(500).json({ error: "Similarity search failed" });
  }
});

app.get("/api/structure/:cid/:type", async (req, res) => {
  try {
    const { cid, type } = req.params;
    if (type === "2d") {
      return res.json({ type: "2d", imageUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=700x700` });
    }
    if (type === "3d") {
      return res.json({ type: "3d", embedUrl: `https://embed.molview.org/v1/?mode=balls&cid=${cid}` });
    }
    if (type === "crystal") {
      return res.json({ type: "crystal", embedUrl: `https://embed.molview.org/v1/?mode=wireframe&cid=${cid}` });
    }
    return res.status(400).json({ error: "Invalid structure type" });
  } catch (err) {
    res.status(500).json({ error: "Failed to load structure" });
  }
});

app.get("/api/cache-stats", (req, res) => res.json({ entries: CACHE.size }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", cache: CACHE.size, uptime: process.uptime() });
});

// ====================== START SERVER ======================
app.listen(PORT, () => {
  console.log(`🚀 ChemVault Backend running on http://localhost:${PORT}`);
  console.log(`📊 Robust SDF cleaner + Smart CID handling active`);
  console.log(`═══════════════════════════════════════════════════════════════`);
});