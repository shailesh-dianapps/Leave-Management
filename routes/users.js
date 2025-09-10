const express = require('express');
const {auth, permit } = require('../middleware/auth');
const {getAllUsers, getUserById} = require('../controllers/userController');

const router = express.Router();

router.get('/', auth, permit('hr', 'management'), getAllUsers);
router.get('/:id', auth, getUserById);

module.exports = router;

