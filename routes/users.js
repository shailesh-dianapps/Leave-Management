// const express = require('express');
// const {auth, permit} = require('../middleware/auth');
// const User = require('../models/user');

// const router = express.Router();

// router.get('/', auth, permit('hr','management'), async (req, res) => {
//     const users = await User.find().select('-password').sort({role: 1, name: 1});
//     res.json({users});
// });


// router.get('/:id', auth, async (req, res) => {
//     const id = req.params.id;
//     if(req.user.role === 'employee' && req.user._id.toString() !== id){
//         return res.status(403).json({error: 'Forbidden'});
//     }
//     const user = await User.findById(id).select('-password');
//     if(!user) return res.status(404).json({error: 'Not found'});
//     res.json({user});
// });

// module.exports = router;



const express = require('express');
const {auth, permit } = require('../middleware/auth');
const {getAllUsers, getUserById} = require('../controllers/userController');

const router = express.Router();

router.get('/', auth, permit('hr', 'management'), getAllUsers);
router.get('/:id', auth, getUserById);

module.exports = router;

