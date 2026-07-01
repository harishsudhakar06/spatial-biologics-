const express = require("express");
const router = express.Router();
const axios = require("axios");
const FormData = require("form-data");

const BASE = "https://biosig.lab.uq.edu.au/deeppk";

const jobStore = new Map();
const JOB_TTL_MS = 30 * 60 * 1000;
const MAX_POLL_TIME_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 5000;

function cleanupJobStore() {
  const now = Date.now();
  for (const [jobId, entry] of jobStore.entries()) {
    if (now - entry.createdAt > JOB_TTL_MS) {
      if (entry.pollTimer) {
        clearTimeout(entry.pollTimer);
      }
      jobStore.delete(jobId);
    }
  }
}

function stopPolling(jobId) {
  const entry = jobStore.get(jobId);
  if (entry && entry.pollTimer) {
    clearTimeout(entry.pollTimer);
    entry.pollTimer = null;
  }
}

function startBackgroundPolling(jobId) {
  const entry = jobStore.get(jobId);
  if (!entry) return;

  let attemptCount = 0;

  const pollDeepPK = async () => {
    const currentEntry = jobStore.get(jobId);
    if (!currentEntry || currentEntry.status !== "running") {
      return;
    }

    attemptCount++;
    console.log(`[DeepPK Poll] jobId: ${jobId} attempt #${attemptCount}`);

    if (Date.now() - currentEntry.createdAt > MAX_POLL_TIME_MS) {
      currentEntry.status = "error";
      currentEntry.error = "Prediction timed out after 10 minutes";
      currentEntry.pollTimer = null;
      console.log(`[DeepPK Poll] jobId: ${jobId} STOPPED — reason: timeout`);
      console.log(`⏱️ Job ${jobId} timed out after 10 minutes`);
      return;
    }

    try {
      const form = new FormData();
      form.append("job_id", jobId);

      const response = await axios({
        method: "GET",
        url: `${BASE}/api/predict`,
        data: `job_id=${encodeURIComponent(jobId)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 25000,
        responseType: "text",
      });

      const raw = String(response.data);

      let status = "running";
      if (raw.includes('"status": "running"') || raw.includes('"status":"running"status":"running"')) {
        status = "running";
      } else if (raw.includes("ERROR while running") || raw.includes("ERROR")) {
        status = "error";
      } else {
        status = "done";
      }
      console.log(`[DeepPK Poll] jobId: ${jobId} status: ${status}`);

      if (status === "running") {
        currentEntry.pollTimer = setTimeout(pollDeepPK, POLL_INTERVAL_MS);
        return;
      }

      if (status === "error") {
        currentEntry.status = "error";
        currentEntry.error = "Could not process this molecule. Please check your SMILES string and try again.";
        currentEntry.pollTimer = null;
        console.log(`[DeepPK Poll] jobId: ${jobId} STOPPED — reason: error`);
        console.log(`❌ Job ${jobId} returned error from DeepPK`);
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        currentEntry.pollTimer = setTimeout(pollDeepPK, POLL_INTERVAL_MS);
        return;
      }

      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          currentEntry.pollTimer = setTimeout(pollDeepPK, POLL_INTERVAL_MS);
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
        currentEntry.pollTimer = setTimeout(pollDeepPK, POLL_INTERVAL_MS);
        return;
      }

      currentEntry.status = "done";
      currentEntry.results = results;
      currentEntry.pollTimer = null;
      console.log(`[DeepPK Poll] jobId: ${jobId} STOPPED — reason: done`);
      console.log(`✅ Job ${jobId} completed, ${results.length} results`);

    } catch (err) {
      console.log(`[DeepPK Poll] jobId: ${jobId} status: network_error`);
      console.error(`❌ Job ${jobId} poll error:`, err.response?.status, err.message);
      currentEntry.pollTimer = setTimeout(pollDeepPK, POLL_INTERVAL_MS);
    }
  };

  entry.pollTimer = setTimeout(pollDeepPK, POLL_INTERVAL_MS);
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

    const response = await axios.post(`${BASE}/api/predict`, form, {
      headers: form.getHeaders(),
      timeout: 20000,
    });

    const jobId = response.data.job_id;
    console.log("[DeepPK Submit] SUCCESS job_id:", jobId, "smiles count:", smilesList.length);
    if (!jobId) {
      return res.status(500).json({ error: "No job_id returned from DeepPK" });
    }

    jobStore.set(jobId, {
      status: "running",
      results: null,
      error: null,
      createdAt: Date.now(),
      pollTimer: null,
    });

    startBackgroundPolling(jobId);
    cleanupJobStore();

    return res.json({ job_id: jobId });
  } catch (err) {
    console.error("[DeepPK Submit] FAILED:", err.message, "status:", err.response?.status);
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
    console.error("❌ ADMET results error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;