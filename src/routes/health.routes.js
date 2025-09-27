const express = require("express");
const redis = require("../config/redis");

const router = express.Router();

router.get("/health/redis", async (req, res) => {
  try {
    await redis.set("health-check", "ok", 10); // expires in 10s
    const value = await redis.get("health-check");
    return res.json({ redis: value === "ok" ? "connected" : "failed" });
  } catch (err) {
    return res.status(500).json({ redis: "error", error: err.message });
  }
});
router.get("/health/mongo", async (req, res) => {
  try {
    await redis.set("health-check", "ok", 10); // expires in 10s
    const value = await redis.get("health-check");
    return res.json({ redis: value === "ok" ? "connected" : "failed" });
  } catch (err) {
    return res.status(500).json({ redis: "error", error: err.message });
  }
});

module.exports = router;
