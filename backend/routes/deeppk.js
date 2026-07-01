const express = require("express");
const router = express.Router();
const axios = require("axios");
const FormData = require("form-data");

const BASE = "https://biosig.lab.uq.edu.au/deeppk";

const jobStore = new Map();
const JOB_TTL_MS = 30 * 60 * 1000;

function cleanupJobStore() {
  const now = Date.now();
  for (const [jobId, entry] of jobStore.entries()) {
    if (now - entry.createdAt > JOB_TTL_MS) {
      jobStore.delete(jobId);
    }
  }
}

router.post("/predict", async (req, res) => {
  try {
    const { smiles, pred_type = "admet" } = req.body;
    if (!smiles) return res.status(400).json({ error: "SMILES required" });

    const smilesList = smiles.split(/[\n,;]+/).map(s => s.trim()).filter(s => s.length > 0);
    if (smilesList.length === 0) {
      return res.status(400).json({ error: "No valid SMILES provided" });
    }
    if (smilesList.length > 15) {
      return res.status(400).json({ error: "Maximum 15 SMILES allowed per prediction run" });
    }

    const form = new FormData();
    form.append("smiles", smiles);
    form.append("pred_type", pred_type);

    console.log("[DeepPK Submit] Submitting", smilesList.length, "SMILES to", BASE);

    const response = await axios.post(`${BASE}/api/predict`, form, {
      headers: form.getHeaders(),
      timeout: 20000,
    });

    const jobId = response.data.job_id;
    console.log("[DeepPK Submit] Got job_id:", jobId);

    jobStore.set(jobId, {
      status: "running",
      results: null,
      error: null,
      createdAt: Date.now(),
    });

    cleanupJobStore();

    setTimeout(pollDeepPK, 10000, jobId, smiles);

    return res.json({ job_id: jobId });

  } catch (err) {
    console.error("[DeepPK Submit] FAILED:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

async function pollDeepPK(jobId, originalSmiles) {
  const entry = jobStore.get(jobId);
  if (!entry || entry.status !== "running") return;

  try {
    const response = await axios({
      method: "GET",
      url: `${BASE}/api/predict`,
      data: `job_id=${encodeURIComponent(jobId)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 20000,
      responseType: "text",
    });

    const raw = String(response.data);
    console.log("[DeepPK Poll]", jobId, "— first 120 chars:", raw.slice(0, 120));

    if (raw.includes('"status": "running"') || raw.includes('"status":"running"')) {
      setTimeout(pollDeepPK, 10000, jobId, originalSmiles);
      return;
    }

    if (raw.includes("ERROR while running") || raw.includes("ERROR")) {
      jobStore.set(jobId, {
        status: "error",
        results: null,
        error: "Could not process this molecule. Please check your SMILES string and try again.",
        createdAt: entry.createdAt,
      });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setTimeout(pollDeepPK, 10000, jobId, originalSmiles);
      return;
    }

    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        setTimeout(pollDeepPK, 10000, jobId, originalSmiles);
        return;
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
      setTimeout(pollDeepPK, 10000, jobId, originalSmiles);
      return;
    }

    console.log("[DeepPK Poll]", jobId, "— done,", results.length, "results");
    jobStore.set(jobId, {
      status: "done",
      results: results,
      error: null,
      createdAt: entry.createdAt,
    });

  } catch (err) {
    console.error("[DeepPK Poll]", jobId, "— error:", err.message);
    setTimeout(pollDeepPK, 10000, jobId, originalSmiles);
  }
}

function parseMolecule(mol) {
  if (!mol || !mol.SMILES) return null;
  const row = { SMILES: mol.SMILES };
  Object.keys(mol).forEach(key => {
    const predMatch = key.match(/^\[.+?\/(.+?)\] Predictions$/);
    if (predMatch) {
      let propName = predMatch[1];

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
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  try {
    const { job_id } = req.query;
    if (!job_id) return res.status(400).json({ error: "job_id required" });

    const entry = jobStore.get(job_id);
    if (!entry) {
      return res.json({ status: "not_found" });
    }

    if (entry.status === "running") {
      return res.json({ status: "running" });
    }

    if (entry.status === "done") {
      return res.json({ status: "done", result: entry.results[0], results: entry.results });
    }

    if (entry.status === "error") {
      return res.json({ status: "error", error: entry.error });
    }

    return res.json({ status: "pending" });

  } catch (err) {
    console.error("[DeepPK] Results error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
