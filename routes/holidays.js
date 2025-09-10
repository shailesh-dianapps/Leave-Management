const express = require('express');
const {auth, permit} = require('../middleware/auth');
const PublicHoliday = require('../models/publicHoliday');

const router = express.Router();

router.get('/', auth, async (req, res) => {
    const holidays = await PublicHoliday.find().sort({date: 1});
    res.json({holidays});
});

router.post('/', auth, permit('hr'), async (req, res) => {
    try{
        const {date, name} = req.body;
        if(!date || !name) return res.status(400).json({error: 'Missing fields'});
        const dt = new Date(date);
        dt.setHours(0,0,0,0);
        const existing = await PublicHoliday.findOne({date: dt});
        if(existing) return res.status(400).json({error: 'Holiday already exists on that date'});
        const h = new PublicHoliday({date: dt, name, createdBy: req.user._id});
        await h.save();
        res.json({message: 'Holiday added', holiday: h});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
});

router.put('/:id', auth, permit('hr'), async (req, res) => {
    try{
        const {date, name} = req.body;
        const update = {};

        if(date){
            const dt = new Date(date); 
            dt.setHours(0,0,0,0); 
            update.date = dt;
        }

        if(name) update.name = name;
        const h = await PublicHoliday.findByIdAndUpdate(req.params.id, update, {new: true});
        if(!h) return res.status(404).json({error: 'Holiday not found'});
        res.json({message: 'Holiday updated', holiday: h});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
});

router.delete('/:id', auth, permit('hr'), async (req,res) => {
    try{
        const h = await PublicHoliday.findByIdAndDelete(req.params.id);
        if(!h) return res.status(404).json({error: 'Holiday not found'});
        res.json({message: 'Deleted'});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
});

module.exports = router;
