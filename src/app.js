// src/app.js
const express = require("express");
const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "backend", timestamp: Date.now() });
});

module.exports = app;
