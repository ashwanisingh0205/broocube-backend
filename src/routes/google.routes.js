const router = require('express').Router();
const controller = require('../controllers/googleController');

router.post('/auth-url', controller.generateAuthURL);
router.get('/auth-url', controller.generateAuthURL);
router.get('/callback', controller.handleCallback);

module.exports = router;


