// server.js
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGO_DB_NAME || "informativeApp"; // ✅ configurable

// MongoDB connection
const client = new MongoClient(MONGO_URI);
let eventsCollection, usersCollection;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db(DB_NAME); // ✅ use env DB name
    eventsCollection = db.collection("events");
    usersCollection = db.collection("users");
    console.log(`✅ Connected to MongoDB, DB: ${DB_NAME}`);
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
  }
}
connectDB();

// Middleware for JWT verification
function authMiddleware(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Missing token" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
}

// ===== AUTH ROUTES =====
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await usersCollection.insertOne({ username, password: hashedPassword });
    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ message: "Signup failed" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await usersCollection.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

// ===== EVENT ROUTES =====
app.get("/events", async (req, res) => {
  try {
    const events = await eventsCollection.find().toArray();

    // Convert ObjectId to plain string for frontend
    const formatted = events.map(e => ({
      ...e,
      _id: e._id.toString()
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ Fetch events error:", err);
    res.status(500).json({ message: "Failed to fetch events" });
  }
});

app.post("/add-event", authMiddleware, async (req, res) => {
  try {
    const event = req.body;
    const result = await eventsCollection.insertOne(event);
    console.log("✅ Event Added:", result.insertedId);
    res.json(result);
  } catch (err) {
    console.error("❌ Add event error:", err);
    res.status(500).json({ message: "Failed to add event" });
  }
});

app.put("/update-event/:id", authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const updatedEvent = req.body;

    console.log("🔎 Incoming Update ID:", id, "Valid?", ObjectId.isValid(id));
    console.log("🔎 Update Body:", updatedEvent);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedEvent }
    );

    console.log("🔎 Mongo Update Result:", result);
    res.json(result);
  } catch (err) {
    console.error("❌ Update event error:", err);
    res.status(500).json({ message: "Failed to update event" });
  }
});

app.delete("/delete-event/:id", authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) });
    res.json(result);
  } catch (err) {
    console.error("❌ Delete event error:", err);
    res.status(500).json({ message: "Failed to delete event" });
  }
});

// Start server
app.listen(PORT, () => { 
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
