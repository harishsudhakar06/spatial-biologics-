const axios = require("axios");
const FormData = require("form-data");

const BASE = "https://biosig.lab.uq.edu.au/deeppk";

async function run() {
  console.log("Submitting SMILES...");
  const postForm = new FormData();
  postForm.append("smiles", "CC(=O)Oc1ccccc1C(=O)O");
  postForm.append("pred_type", "admet");

  const postRes = await axios.post(`${BASE}/api/predict`, postForm, {
    headers: postForm.getHeaders(),
    timeout: 20000,
  });
  const job_id = postRes.data.job_id;
  console.log("Job ID:", job_id);

  console.log("Polling every 10 seconds...");
  for (let i = 0; i < 18; i++) {
    await new Promise(r => setTimeout(r, 10000));
    console.log(`\nAttempt ${i + 1} (${(i + 1) * 10}s)...`);

    try {
      const getForm = new FormData();
      getForm.append("job_id", job_id);

      const getRes = await axios({
        method: "GET",
        url: `${BASE}/api/predict`,
        data: getForm,
        headers: getForm.getHeaders(),
        timeout: 20000,
        responseType: "text",
      });

      const raw = String(getRes.data);
      console.log("First 300 chars:", raw.slice(0, 300));

      if (!raw.includes("RUNNING") && !raw.includes("running")) {
        console.log("\n=== RESULTS ARRIVED ===");
        console.log("Is JSON array?", raw.trim().startsWith("["));
        console.log("Is HTML?", raw.includes("<html"));
        if (raw.trim().startsWith("[")) {
          const parsed = JSON.parse(raw);
          console.log("Array length:", parsed.length);
          console.log("First item:", JSON.stringify(parsed[0], null, 2));
        } else {
          console.log("Full response:", raw.slice(0, 1000));
        }
        break;
      } else {
        console.log("Still running...");
      }
    } catch (err) {
      console.log("Error:", err.response?.status, err.message);
    }
  }
}

run().catch(console.error);