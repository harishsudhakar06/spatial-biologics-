import { JSONFilePreset } from "lowdb/node";

// lowdb v7 uses ESM — but since your server uses CommonJS,
// we use a simpler approach with native fs JSON
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const DB_FILE = path.join(__dirname, "db.json");

// Initialize db file if it doesn't exist
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
      users: [],
      otps: []
    }, null, 2));
  }
}

function readDB() {
  initDB();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return { users: [], otps: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ── User operations ──
function getAllUsers() {
  return readDB().users;
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
    id: Date.now().toString(),
    username,
    email,
    password,
    phone,
    designation,
    affiliation,
    createdAt: new Date().toISOString()
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

// ── OTP operations ──
function saveOTP(email, otp) {
  const db = readDB();
  // Remove any existing OTP for this email
  db.otps = db.otps.filter(o => o.email !== email);
  db.otps.push({
    email,
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000  // 5 minutes
  });
  writeDB(db);
}

function getOTP(email) {
  const db = readDB();
  return db.otps.find(o => o.email === email) || null;
}

function deleteOTP(email) {
  const db = readDB();
  db.otps = db.otps.filter(o => o.email !== email);
  writeDB(db);
}

// Clean expired OTPs (call periodically)
function cleanExpiredOTPs() {
  const db = readDB();
  db.otps = db.otps.filter(o => o.expiresAt > Date.now());
  writeDB(db);
}

module.exports = {
  getAllUsers,
  getUserByEmail,
  getUserById,
  createUser,
  updateUserPassword,
  saveOTP,
  getOTP,
  deleteOTP,
  cleanExpiredOTPs,
};