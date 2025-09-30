// src/routes/linkedin.routes.js
const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const controller = require('../controllers/linkedinController');

router.post('/auth-url', authenticate, controller.generateAuthURL);
router.get('/auth-url', authenticate, controller.generateAuthURL);
router.get('/callback', controller.handleCallback);

// Simple health for debugging mounting
router.get('/ping', (req, res) => res.json({ ok: true }));

module.exports = router;


