const express = require("express");
const router = express.Router();
const axios = require("axios");
const FormData = require("form-data");

const BASE = "https://biosig.lab.uq.edu.au/deeppk";

router.post("/predict", async (req, res) => {
  try {
    const { smiles, pred_type = "admet" } = req.body;
    if (!smiles) return res.status(400).json({ error: "SMILES required" });

    const form = new FormData();
    form.append("smiles", smiles);
    form.append("pred_type", pred_type);

    const response = await axios.post(`${BASE}/api/predict`, form, {
      headers: form.getHeaders(),
      timeout: 20000,
    });

    console.log("✅ ADMET submitted:", response.data);
    return res.json(response.data);
  } catch (err) {
    console.error("❌ ADMET submit error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

function parseMolecule(mol) {
  if (!mol || !mol.SMILES) return null;
  const row = { SMILES: mol.SMILES };
  Object.keys(mol).forEach(key => {
    const predMatch = key.match(/^\[.+?\/(.+?)\] Predictions$/);
    if (predMatch) {
      let propName = predMatch[1];
      
      // Normalize names to match frontend ALL_COLS columns
      if (propName === "Blood-Brain Barrier (Central Nervous System)") propName = "Blood-Brain Barrier CNS";
      else if (propName === "CYP 1A2_substrate") propName = "CYP 1A2 Substrate";
      else if (propName === "CYP 2C19_substrate") propName = "CYP 2C19 Substrate";
      else if (propName === "Eye irritation") propName = "Eye Irritation";
      else if (propName === "Daphnia Maga") propName = "Daphnia Magna";
      else if (propName === "Micronucleos") propName = "Micronucleus";
      else if (propName === "Log S") propName = "Log(S)";

      const interpKey = key.replace("] Predictions", "] Interpretation");
      const pred = mol[key];
      const interp = mol[interpKey];

      if (interp && interp !== "None" && interp.trim() !== "") {
        row[propName] = interp
          .replace(/<br\/>/gi, " | ")
          .replace(/&nbsp;/gi, " ")
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();
      } else {
        row[propName] = pred !== null && pred !== undefined ? String(pred) : "-";
      }
    }
  });
  return row;
}

router.get("/results", async (req, res) => {
  try {
    const { job_id } = req.query;
    if (!job_id) return res.status(400).json({ error: "job_id required" });

    const form = new FormData();
    form.append("job_id", job_id);

    // The UQ server strictly requires job_id passed in form-urlencoded format in the GET body
    const response = await axios({
      method: "GET",
      url: `${BASE}/api/predict`,
      data: `job_id=${encodeURIComponent(job_id)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 20000,
      responseType: "text",
    });

    const raw = String(response.data);
    console.log("ADMET poll (first 120):", raw.slice(0, 120));

    // Still running
    if (raw.includes('"status": "running"') || raw.includes('"status":"running"')) {
      return res.json({ status: "running" });
    }

    // Server-side error — stop immediately, don't keep polling
    if (raw.includes("ERROR while running") || raw.includes("ERROR")) {
      return res.json({
        status: "error",
        message: "Could not process this molecule. Please check your SMILES string and try again.",
      });
    }

    // Parse response (may be double-encoded JSON string)
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.json({ status: "running" });
    }

    // If still a string (double-encoded), parse again
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return res.json({ status: "running" });
      }
    }

    const results = [];
    if (parsed["0"]) {
      let idx = 0;
      while (parsed[String(idx)]) {
        const mol = parsed[String(idx)];
        const row = parseMolecule(mol);
        if (row) results.push(row);
        idx++;
      }
    } else if (parsed.SMILES) {
      const row = parseMolecule(parsed);
      if (row) results.push(row);
    }

    if (results.length === 0) {
      return res.json({ status: "running" });
    }

    console.log("✅ ADMET parsed, count:", results.length);
    return res.json({ status: "done", result: results[0], results: results });

  } catch (err) {
    console.error("❌ ADMET poll error:", err.response?.status, err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;