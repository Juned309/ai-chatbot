import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("chat.db");

// Initialize database
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/messages", (req, res) => {
    const messages = db.prepare("SELECT role, content FROM messages ORDER BY timestamp ASC").all();
    res.json(messages);
  });

  app.post("/api/messages", (req, res) => {
    const { role, content } = req.body;
    if (!role || !content) {
      return res.status(400).json({ error: "Role and content are required" });
    }
    db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run(role, content);
    res.json({ success: true });
  });

  app.get("/api/profile", (req, res) => {
    const profile = db.prepare("SELECT key, value FROM user_profile").all();
    const profileObj = profile.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(profileObj);
  });

  app.post("/api/profile", (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO user_profile (key, value) VALUES (?, ?)").run(key, value);
    res.json({ success: true });
  });

  app.post("/api/clear", (req, res) => {
    db.prepare("DELETE FROM messages").run();
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
