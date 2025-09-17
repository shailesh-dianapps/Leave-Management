const express = require('express');
const {auth} = require('../middleware/auth');
const {getAllUsers, getUserById} = require('../controllers/userController');

const router = express.Router();

router.get('/', auth, getAllUsers);
router.get('/:id', auth, getUserById);

module.exports = router;

