// src/routes/auth.routes.js
const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const { validateWithJoi, userValidation, validationRules, validateRequest } = require('../utils/validator');
const { authLimiter, passwordResetLimiter } = require('../middlewares/rateLimiter');
const ctrl = require('../controllers/authController');

router.post('/register', authLimiter, validateWithJoi(userValidation.register), ctrl.register);
router.post('/login', authLimiter, validateWithJoi(userValidation.login), ctrl.login);

router.get('/me', authenticate, ctrl.getProfile);
router.put('/me', authenticate, validateWithJoi(userValidation.updateProfile), ctrl.updateProfile);
router.post('/change-password', authenticate, ctrl.changePassword);

router.post('/request-password-reset', passwordResetLimiter, ctrl.requestPasswordReset);
router.post('/reset-password/:token', ctrl.resetPassword);

router.post('/logout', authenticate, ctrl.logout);

router.get('/verify/:token', ctrl.verifyEmail);
router.post('/resend-verification', authenticate, ctrl.resendVerification);

module.exports = router;


