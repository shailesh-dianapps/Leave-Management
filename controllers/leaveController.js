const LeaveRequest = require('../models/leaveRequest');
const PublicHoliday = require('../models/publicHoliday');
const User = require('../models/user');

function parseDateToUTC(dateStr){
    const parts = dateStr.split('-');
    if(parts.length !== 3) return null;

    const year = parseInt(parts[0], 10);  // base-10 integer
    const month = parseInt(parts[1], 10) - 1;   // JS months are 0-indexed
    const day = parseInt(parts[2], 10);

    if(isNaN(year) || isNaN(month) || isNaN(day)) return null;

    return new Date(Date.UTC(year, month, day)); // UTC midnight - return a time in miliseconds
}


function normalizeUTC(d) {
    const dt = new Date(d);
    return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

async function computeWorkingDays(start, end) {
    const startDate = normalizeUTC(start);
    const endDate = normalizeUTC(end);
    if(startDate > endDate) return 0;

    const holidays = await PublicHoliday.find({date: {$gte: startDate, $lte: endDate}});
    const holidaySet = new Set(holidays.map(h => normalizeUTC(h.date).toISOString()));

    let count = 0;
    for(let d=new Date(startDate); d<=endDate; d.setUTCDate(d.getUTCDate()+1)){
        const day = d.getUTCDay();
        if(day === 0 || day === 6) continue; // skip weekends
        if(holidaySet.has(normalizeUTC(d).toISOString())) continue; // skip holidays
        count++;
    }
    return count;
}

exports.requestLeave = async (req, res) => {
    try{
        const {leaveType, startDate, endDate, comment} = req.body;
        if(!startDate || !endDate || !leaveType){
            return res.status(400).json({error: 'Missing fields'});
        }

        const start = parseDateToUTC(startDate);
        const end = parseDateToUTC(endDate);
        if(!start || !end) return res.status(400).json({error: 'Invalid date format'});
        if(start > end) return res.status(400).json({error: 'startDate cannot be after endDate'});

        // Check overlapping leaves for employee or HR
        if(['employee', 'hr'].includes(req.user.role)){
            const existing = await LeaveRequest.findOne({
                applicant: req.user._id,
                startDate: {$lte: end},
                endDate: {$gte: start}
            });

            if(existing){
                return res.status(400).json({
                    error: 'You already have a leave request covering one or more of these dates'
                });
            }
        }
        // Check for public holidays in UTC
        const holidays = await PublicHoliday.find({date: {$gte: start, $lte: end}});
        
        if(holidays.length > 0){
            const holidayNames = holidays.map(h => `${h.name} (${h.date.toUTCString().split(' ')[0]} ${h.date.getUTCDate()})`);
            return res.status(400).json({error: `You cannot apply leave on public holidays: ${holidayNames.join(', ')}` });
        }

        const workingDays = await computeWorkingDays(start, end);
        if(workingDays <= 0) return res.status(400).json({error: 'No working days in selected range'});

        const applicant = await User.findById(req.user._id);
        if(!applicant) return res.status(404).json({error: 'Applicant not found'});

        if(applicant.leaveBalance <= 0){
            return res.status(400).json({error: 'Insufficient leave balance'});
        }
        if(applicant.leaveBalance < workingDays){
            return res.status(400).json({error: `You only have ${applicant.leaveBalance} days left`});
        }

        const leave = new LeaveRequest({
            applicant: req.user._id,
            leaveType,
            startDate: start,
            endDate: end,
            workingDays,
            comment
        });

        await leave.save();
        return res.json({message: 'Leave requested', leave});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};

exports.getLeaves = async (req, res) => {
    try {
        const role = req.user.role;
        let filter = {};

        if(role === 'employee') filter.applicant = req.user._id;
        else if(role === 'hr'){
            filter = {
                applicant: req.user._id,
                status: {$in: ['pending', 'rejected']}
            };
        }
        else if(role === 'management'){
            const hrLeaves = await LeaveRequest.find({
                status: {$in: ['pending', 'approved', 'rejected']}
            }).populate('applicant approver', 'name email role');

            const filteredHrLeaves = hrLeaves.filter(l => l.applicant?.role === 'hr');
            return res.json({
                totalRecords: filteredHrLeaves.length,
                page: 1,
                totalPages: 1,
                leaves: filteredHrLeaves
            });
        } 
        else return res.json({totalRecords: 0, page: 1, totalPages: 0, leaves: []});

        let {page, limit} = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        const totalRecords = await LeaveRequest.countDocuments(filter);

        const leaves = await LeaveRequest.find(filter)
            .populate('applicant approver', 'name email role').skip(skip).limit(limit);

        res.json({
            totalRecords,
            page,
            totalPages: Math.ceil(totalRecords / limit),
            leaves
        });
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};

// Get user's pending leave requests
exports.getMyPendingLeaves = async (req, res) => {
    try{
        const leaves = await LeaveRequest.find({
            applicant: req.user._id,
            status: 'pending'
        }).populate('applicant approver', 'name role email');
        
        res.json({leaves});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};

// Get user's approved leave requests
exports.getMyApprovedLeaves = async (req, res) => {
    try{
        const leaves = await LeaveRequest.find({
            applicant: req.user._id,
            status: 'approved'
        }).populate('applicant approver', 'name role email');
        
        res.json({leaves});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};

// Get user's rejected leave requests
exports.getMyRejectedLeaves = async (req, res) => {
    try{
        const leaves = await LeaveRequest.find({
            applicant: req.user._id,
            status: 'rejected'
        }).populate('applicant approver', 'name role email');
        
        res.json({leaves});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};


exports.getPendingLeaves = async (req, res) => {
    try {
        let query = {status: 'pending'};
        let leaves = await LeaveRequest.find(query).populate('applicant approver', 'name role email');

        if(req.user.role === 'hr'){
            leaves = leaves.filter(l => l.applicant?.role === 'employee');
        }
        res.json({leaves});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};

exports.getRejectedLeaves = async (req, res) => {
    try{
        let query = {status: 'rejected'};
        let leaves = await LeaveRequest.find(query).populate('applicant approver', 'name role email');

        if(req.user.role === 'hr'){
            leaves = leaves.filter(l => l.applicant?.role === 'employee');
        }
        res.json({leaves});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};

exports.getApprovedLeaves = async (req, res) => {
    try{
        let query = {status: 'approved'};
        let leaves = await LeaveRequest.find(query).populate('applicant approver', 'name role email');

        if(req.user.role === 'hr'){
            leaves = leaves.filter(l => l.applicant?.role === 'employee');
        }
        res.json({leaves});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};

exports.approveLeave = async (req, res) => {
    try{
        const leave = await LeaveRequest.findById(req.params.id).populate('applicant');
        if(!leave) return res.status(404).json({error: 'Leave not found'});
        if(leave.status !== 'pending') return res.status(400).json({error: 'Leave not pending'});

        const applicantRole = leave.applicant.role;
        const approverRole = req.user.role;

        if(applicantRole === 'employee' && approverRole !== 'hr'){
            return res.status(403).json({error: 'Only HR can approve employee leaves'});
        } 
        else if(applicantRole === 'hr' && approverRole !== 'management'){
            return res.status(403).json({error: 'Only Management can approve HR leaves'});
        } 
        else if(applicantRole !== 'employee' && applicantRole !== 'hr'){
            return res.status(403).json({error: 'Approvals for this applicant role are not supported'});
        }

        const applicant = await User.findById(leave.applicant._id);
        if(!applicant) return res.status(404).json({error: 'Applicant not found'});

        if(applicant.leaveBalance < leave.workingDays) {
            return res.status(400).json({error: `User has only ${applicant.leaveBalance} days left`});
        }

        applicant.leaveBalance -= leave.workingDays;
        await applicant.save();

        leave.status = 'approved';
        leave.approver = req.user._id;
        leave.updatedAt = new Date();
        await leave.save();

        res.json({message: 'Leave approved', leave});
    }
    catch(err){
        console.error('approve error', err);
        res.status(500).json({error: 'Server error'});
    }
};

exports.rejectLeave = async (req, res) => {
    try {
        const leave = await LeaveRequest.findById(req.params.id).populate('applicant');
        if (!leave) return res.status(404).json({ error: 'Leave not found' });
        if (leave.status !== 'pending') return res.status(400).json({ error: 'Leave not pending' });

        const applicantRole = leave.applicant.role;
        const approverRole = req.user.role;

        if(applicantRole === 'employee' && approverRole !== 'hr'){
            return res.status(403).json({error: 'Only HR can reject employee leaves'});
        } 
        else if(applicantRole === 'hr' && approverRole !== 'management'){
            return res.status(403).json({error: 'Only Management can reject HR leaves'});
        }
        else if(applicantRole !== 'employee' && applicantRole !== 'hr'){
            return res.status(403).json({error: 'Rejections for this applicant role are not supported'});
        }

        leave.status = 'rejected';
        leave.approver = req.user._id;
        leave.updatedAt = new Date();
        await leave.save();

        res.json({message: 'Leave rejected', leave});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};
