const mongoose = require("mongoose");

const workspaceSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  activeProjectId: { type: String, default: "SPB001" },
  projects: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model("Workspace", workspaceSchema);
