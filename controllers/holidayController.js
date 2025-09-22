const PublicHoliday = require('../models/publicHoliday');
const LeaveRequest = require('../models/leaveRequest');
const User = require('../models/user');

function parseDateToUTC(dateStr){
    const parts = dateStr.split('-');
    if(parts.length !== 3) return null;

    const year = parseInt(parts[0], 10);  // base-10 integer
    const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
    const day = parseInt(parts[2], 10);

    if(isNaN(year) || isNaN(month) || isNaN(day)) return null;
    return new Date(Date.UTC(year, month, day)); // UTC midnight - return a time in miliseconds
}

exports.getHolidays = async (req, res) => {
    try{
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const holidays = await PublicHoliday.find().sort({date: 1}).skip(skip).limit(limit);
        const total = await PublicHoliday.countDocuments();
        res.json({page, limit, total, totalPages: Math.ceil(total/limit), holidays});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};

async function rejectLeavesOnHoliday(holiday) {
    const holidayDate = holiday.date;

    const overlappingLeaves = await LeaveRequest.find({
        status: 'approved',
        startDate: {$lte: holidayDate},
        endDate: {$gte: holidayDate}
    }).populate('applicant');

    if(!overlappingLeaves.length) return;

    const bulkUserOps = [];
    const bulkLeaveOps = [];

    for(let leave of overlappingLeaves){
        const applicant = leave.applicant;
        if(!applicant) continue;

        // restore balance
        bulkUserOps.push({
            updateOne: {
                filter: {_id: applicant._id},
                update: {$inc: {leaveBalance: leave.workingDays}}
            }
        });

        const rejectedBy = applicant.role === 'employee' ? 'hr' : 'management';

        bulkLeaveOps.push({
            updateOne: {
                filter: {_id: leave._id},
                update: {
                    $set: {
                        status: 'rejected',
                        updatedAt: new Date(),
                        rejectedBy,
                        rejectedReason: `Rejected due to public holiday on ${holidayDate.toISOString().split('T')[0]}`
                    }
                }
            }
        });
    }

    if(bulkUserOps.length) await User.bulkWrite(bulkUserOps);
    if(bulkLeaveOps.length) await LeaveRequest.bulkWrite(bulkLeaveOps);
}

exports.addHoliday = async (req, res) => {
    try{
        const {date, name} = req.body;
        if(!date || !name) return res.status(400).json({error: 'Missing fields'});

        const dtUTC = parseDateToUTC(date);
        if(!dtUTC) return res.status(400).json({error: 'Invalid date format'});

        // Check if date is in the past (UTC)
        const todayUTC = new Date();
        todayUTC.setUTCHours(0, 0, 0, 0);  // setUTCHours(hour, min, sec, millisec)

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

        await rejectLeavesOnHoliday(h);
        res.json({message: 'Holiday added (overlapping leaves rejected)', holiday: h});
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
            const dtUTC = parseDateToUTC(date);
            if (!dtUTC) return res.status(400).json({error: 'Invalid date format'});

            // Check if date is in the past (UTC)
            const todayUTC = new Date();
            todayUTC.setUTCHours(0, 0, 0, 0);
            if(dtUTC < todayUTC) return res.status(400).json({error: 'Holiday date cannot be in the past'});

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

        if(update.date) await rejectLeavesOnHoliday(h);

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