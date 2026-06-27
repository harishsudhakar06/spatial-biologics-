const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "spatial_biologics_secret_2024";

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access denied. Please login." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}

module.exports = authMiddleware;