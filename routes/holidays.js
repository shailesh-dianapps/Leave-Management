// const express = require('express');
// const {auth, permit} = require('../middleware/auth');
// const PublicHoliday = require('../models/publicHoliday');

// const router = express.Router();

// router.get('/', auth, async (req, res) => {
//     const holidays = await PublicHoliday.find().sort({date: 1});
//     res.json({holidays});
// });

// router.post('/', auth, permit('hr'), async (req, res) => {
//     try{
//         const {date, name} = req.body;
//         if(!date || !name) return res.status(400).json({error: 'Missing fields'});

//         const dt = new Date(date);
//         if(isNaN(dt)){
//             return res.status(400).json({error: 'Invalid date format'});
//         }

//         dt.setHours(0,0,0,0);

//         if(dt < new Date().setHours(0,0,0,0)){
//             return res.status(400).json({error: 'Holiday date cannot be in the past'});
//         }

//         if(typeof name !== 'string' || name.trim().length < 3){
//             return res.status(400).json({error: 'Holiday name must be at least 3 characters'});
//         }

//         const existing = await PublicHoliday.findOne({date: dt});
//         if(existing) return res.status(400).json({error: 'Holiday already exists on that date'});

//         const h = new PublicHoliday({date: dt, name: name.trim(), createdBy: req.user._id});
//         await h.save();
//         res.json({message: 'Holiday added', holiday: h});
//     } 
//     catch(err){
//         console.error(err);
//         res.status(500).json({error: 'Server error'});
//     }
// });

// router.put('/:id', auth, permit('hr'), async (req, res) => {
//     try{
//         const {date, name} = req.body;
//         const update = {};

//         if(date){
//             const dt = new Date(date);
//             if(isNaN(dt)){
//                 return res.status(400).json({error: 'Invalid date format'});
//             }
//             dt.setHours(0,0,0,0);

//             if(dt < new Date().setHours(0,0,0,0)){
//                 return res.status(400).json({error: 'Holiday date cannot be in the past'});
//             }

//             const existing = await PublicHoliday.findOne({date: dt, _id: {$ne: req.params.id}});
//             if(existing){
//                 return res.status(400).json({error: 'Another holiday already exists on that date'});
//             }

//             update.date = dt;
//         }

//         if(name){
//             if(typeof name !== 'string' || name.trim().length < 3){
//                 return res.status(400).json({error: 'Holiday name must be at least 3 characters'});
//             }
//             update.name = name.trim();
//         }

//         const h = await PublicHoliday.findByIdAndUpdate(req.params.id, update, {new: true});
//         if(!h) return res.status(404).json({error: 'Holiday not found'});
//         res.json({message: 'Holiday updated', holiday: h});
//     } 
//     catch(err){
//         console.error(err);
//         res.status(500).json({error: 'Server error'});
//     }
// });

// router.delete('/:id', auth, permit('hr'), async (req,res) => {
//     try{
//         const h = await PublicHoliday.findByIdAndDelete(req.params.id);
//         if(!h) return res.status(404).json({error: 'Holiday not found'});
//         res.json({message: 'Deleted'});
//     } 
//     catch(err){
//         console.error(err);
//         res.status(500).json({error: 'Server error'});
//     }
// });

// module.exports = router;


const express = require('express');
const {auth, permit} = require('../middleware/auth');
const {addHoliday, getHolidays, updateHoliday, deleteHoliday} = require('../controllers/holidayController');

const router = express.Router();

router.post('/', auth, permit('hr'), addHoliday);
router.get('/', auth, getHolidays);
router.put('/:id', auth, permit('hr'), updateHoliday);
router.delete('/:id', auth, permit('hr'), deleteHoliday);

module.exports = router;


