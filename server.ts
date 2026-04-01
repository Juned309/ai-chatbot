import express from "express";
import rateLimit from "express-rate-limit";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

export function createApp(database: Database.Database) {
  const app = express();

  app.use(express.json());
  app.use(apiLimiter);

  // API Routes
  app.get("/api/messages", (_req, res) => {
    const messages = database.prepare("SELECT role, content FROM messages ORDER BY timestamp ASC").all();
    res.json(messages);
  });

  app.post("/api/messages", (req, res) => {
    const { role, content } = req.body;
    if (!role || !content) {
      return res.status(400).json({ error: "Role and content are required" });
    }
    database.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run(role, content);
    res.json({ success: true });
  });

  app.get("/api/profile", (_req, res) => {
    const profile = database.prepare("SELECT key, value FROM user_profile").all();
    const profileObj = profile.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(profileObj);
  });

  app.post("/api/profile", (req, res) => {
    const { key, value } = req.body;
    database.prepare("INSERT OR REPLACE INTO user_profile (key, value) VALUES (?, ?)").run(key, value);
    res.json({ success: true });
  });

  app.post("/api/clear", (_req, res) => {
    database.prepare("DELETE FROM messages").run();
    res.json({ success: true });
  });

  return app;
}

async function startServer() {
  const { createServer: createViteServer } = await import("vite");

  const db = new Database("chat.db");

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS user_profile (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  const app = createApp(db);
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only auto-start when run directly (not imported for tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
