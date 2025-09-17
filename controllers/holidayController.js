const PublicHoliday = require('../models/publicHoliday');

exports.getHolidays = async (req, res) => {
    try{
        const holidays = await PublicHoliday.find().sort({date: 1});
        res.json({holidays});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};

exports.addHoliday = async (req, res) => {
    try{
        const {date, name} = req.body;
        if(!date || !name) return res.status(400).json({error: 'Missing fields'});

        const dt = new Date(date);
        if(isNaN(dt)){
            return res.status(400).json({error: 'Invalid date format'});
        }

        // Convert to UTC midnight
        const dtUTC = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));

        // Check if date is in the past (UTC)
        const todayUTC = new Date();
        todayUTC.setUTCHours(0, 0, 0, 0);

        if(dtUTC < todayUTC){
            return res.status(400).json({error: 'Holiday date cannot be in the past'});
        }

        if(typeof name !== 'string' || name.trim().length < 3){
            return res.status(400).json({error: 'Holiday name must be at least 3 characters'});
        }

        const existing = await PublicHoliday.findOne({date: dtUTC, name: name.trim()});
        if(existing){
            return res.status(400).json({error: `Holiday '${name.trim()}' already exists on this date`});
        }

        const h = new PublicHoliday({
            date: dtUTC,
            name: name.trim(),
            createdBy: req.user._id
        });
        await h.save();

        res.json({message: 'Holiday added', holiday: h});
    } 
    catch(err){ 
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};


exports.updateHoliday = async (req, res) => {
    try{
        const {date, name} = req.body;
        const update = {};

        if(date){
            const dt = new Date(date);
            if(isNaN(dt)) return res.status(400).json({error: 'Invalid date format'});

            // Convert to UTC midnight
            const dtUTC = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));

            // Check if date is in the past
            const todayUTC = new Date();
            todayUTC.setUTCHours(0, 0, 0, 0);

            if(dtUTC < todayUTC){
                return res.status(400).json({error: 'Holiday date cannot be in the past'});
            }
            update.date = dtUTC;
        }

        if(name){
            if(typeof name !== 'string' || name.trim().length < 3){
                return res.status(400).json({error: 'Holiday name must be at least 3 characters'});
            }
            update.name = name.trim();
        }

        if(update.date || update.name){
            const existing = await PublicHoliday.findOne({
                _id: {$ne: req.params.id},
                date: update.date || undefined,
                name: update.name || undefined
            });
            if(existing){
                return res.status(400).json({error: 'A holiday with the same name already exists on this date'});
            }
        }

        const h = await PublicHoliday.findByIdAndUpdate(req.params.id, update, {new: true});
        if(!h) return res.status(404).json({error: 'Holiday not found'});

        res.json({message: 'Holiday updated', holiday: h});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};

exports.deleteHoliday = async (req, res) => {
    try{
        const h = await PublicHoliday.findByIdAndDelete(req.params.id);
        if(!h) return res.status(404).json({error: 'Holiday not found'});
        res.json({message: 'Deleted'});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};
