// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import request from "supertest";
import { createApp } from "./server";

function createTestDb() {
  const db = new Database(":memory:");
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
  return db;
}

describe("Express API Routes", () => {
  let app: ReturnType<typeof createApp>;
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    app = createApp(db);
  });

  describe("GET /api/messages", () => {
    it("returns an empty array when no messages exist", async () => {
      const res = await request(app).get("/api/messages");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns all messages ordered by timestamp", async () => {
      db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run("user", "Hello");
      db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run("model", "Hi there!");

      const res = await request(app).get("/api/messages");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({ role: "user", content: "Hello" });
      expect(res.body[1]).toMatchObject({ role: "model", content: "Hi there!" });
    });

    it("only returns role and content fields", async () => {
      db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run("user", "Test");
      const res = await request(app).get("/api/messages");
      expect(res.body[0]).not.toHaveProperty("id");
      expect(res.body[0]).not.toHaveProperty("timestamp");
    });
  });

  describe("POST /api/messages", () => {
    it("saves a message and returns success", async () => {
      const res = await request(app)
        .post("/api/messages")
        .send({ role: "user", content: "Hello!" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });

      const row = db.prepare("SELECT * FROM messages").get() as any;
      expect(row.role).toBe("user");
      expect(row.content).toBe("Hello!");
    });

    it("saves a model message", async () => {
      const res = await request(app)
        .post("/api/messages")
        .send({ role: "model", content: "Hey babe!" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it("returns 400 when role is missing", async () => {
      const res = await request(app)
        .post("/api/messages")
        .send({ content: "Hello!" });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ error: "Role and content are required" });
    });

    it("returns 400 when content is missing", async () => {
      const res = await request(app)
        .post("/api/messages")
        .send({ role: "user" });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ error: "Role and content are required" });
    });

    it("returns 400 when body is empty", async () => {
      const res = await request(app).post("/api/messages").send({});

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ error: "Role and content are required" });
    });
  });

  describe("GET /api/profile", () => {
    it("returns an empty object when profile is empty", async () => {
      const res = await request(app).get("/api/profile");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });

    it("returns the stored profile as a key-value object", async () => {
      db.prepare("INSERT INTO user_profile (key, value) VALUES (?, ?)").run("name", "John");
      db.prepare("INSERT INTO user_profile (key, value) VALUES (?, ?)").run("hobbies", "coding");

      const res = await request(app).get("/api/profile");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ name: "John", hobbies: "coding" });
    });
  });

  describe("POST /api/profile", () => {
    it("inserts a new profile key-value pair", async () => {
      const res = await request(app)
        .post("/api/profile")
        .send({ key: "name", value: "Alice" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });

      const row = db.prepare("SELECT * FROM user_profile WHERE key = 'name'").get() as any;
      expect(row.value).toBe("Alice");
    });

    it("updates an existing profile key (INSERT OR REPLACE)", async () => {
      db.prepare("INSERT INTO user_profile (key, value) VALUES (?, ?)").run("name", "Alice");

      await request(app).post("/api/profile").send({ key: "name", value: "Bob" });

      const row = db.prepare("SELECT * FROM user_profile WHERE key = 'name'").get() as any;
      expect(row.value).toBe("Bob");

      const count = (db.prepare("SELECT COUNT(*) as c FROM user_profile WHERE key = 'name'").get() as any).c;
      expect(count).toBe(1);
    });
  });

  describe("POST /api/clear", () => {
    it("deletes all messages and returns success", async () => {
      db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run("user", "Hello");
      db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run("model", "Hi");

      const res = await request(app).post("/api/clear");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });

      const count = (db.prepare("SELECT COUNT(*) as c FROM messages").get() as any).c;
      expect(count).toBe(0);
    });

    it("returns success even when there are no messages to clear", async () => {
      const res = await request(app).post("/api/clear");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it("does not delete profile data", async () => {
      db.prepare("INSERT INTO user_profile (key, value) VALUES (?, ?)").run("name", "Alice");
      db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run("user", "Hello");

      await request(app).post("/api/clear");

      const profile = db.prepare("SELECT * FROM user_profile WHERE key = 'name'").get() as any;
      expect(profile.value).toBe("Alice");
    });
  });
});
