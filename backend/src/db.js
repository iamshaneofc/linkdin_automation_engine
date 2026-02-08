import pkg from "pg";
import config from "./config/index.js";

const { Pool } = pkg;

// pg expects password to be a string; avoid SASL "client password must be a string"
const db = config.database;

// Check if DATABASE_URL is provided (typical for Railway/Render deployments)
const poolConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for most cloud providers (Railway/Render)
  max: db.max,
  idleTimeoutMillis: db.idleTimeoutMillis,
  connectionTimeoutMillis: db.connectionTimeoutMillis
} : {
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password != null ? String(db.password) : '',
  database: db.database,
  ssl: db.ssl,
  max: db.max,
  idleTimeoutMillis: db.idleTimeoutMillis,
  connectionTimeoutMillis: db.connectionTimeoutMillis
};

const pool = new Pool(poolConfig);

pool.on("connect", () => {
  console.log("✅ Database connected");
});

pool.on("error", (err) => {
  console.error("❌ Database connection error:", err);
});

export default pool;