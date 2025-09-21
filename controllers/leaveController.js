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

        const today = normalizeUTC(new Date());
        if(start < today) return res.status(400).json({error: 'Leave cannot start in the past'});

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

// own leaves of hr and emp
async function getMyLeavesByStatus(req, res, status){
    try{
        if(!['employee', 'hr'].includes(req.user.role)){
            return res.status(403).json({error: 'Only employees and HR can view their own leaves'});
        }

        const leaves = await LeaveRequest.find({
            applicant: req.user._id,
            status
        }).populate('applicant approver', 'name role email');

        res.json({leaves});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
}

// own leaves of hr and emp
exports.getMyPendingLeaves = (req, res) => getMyLeavesByStatus(req, res, 'pending');
exports.getMyApprovedLeaves = (req, res) => getMyLeavesByStatus(req, res, 'approved');
exports.getMyRejectedLeaves = (req, res) => getMyLeavesByStatus(req, res, 'rejected');


// hr can see emp leaves
// management can see hr leaves
async function getLeavesByStatusForRole(req, res, status){
    try{
        let leaves = await LeaveRequest.find({status}).populate('applicant approver', 'name role email');

        if(req.user.role === 'hr'){
            leaves = leaves.filter(l => l.applicant?.role === 'employee');
        } 
        else if(req.user.role === 'management'){
            leaves = leaves.filter(l => l.applicant?.role === 'hr');
        } 
        else{
            return res.status(403).json({error: 'Forbidden'});
        }

        res.json({leaves});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
}

// hr can see emp leaves
// management can see hr leaves
exports.getPendingLeaves = (req, res) => getLeavesByStatusForRole(req, res, 'pending');
exports.getRejectedLeaves = (req, res) => getLeavesByStatusForRole(req, res, 'rejected');
exports.getApprovedLeaves = (req, res) => getLeavesByStatusForRole(req, res, 'approved');


exports.approveLeaveRequest = async (req, res) => {
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

        if(applicant.leaveBalance < leave.workingDays){
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

exports.rejectLeaveRequest = async (req, res) => {
    try{
        const leave = await LeaveRequest.findById(req.params.id).populate('applicant');
        if (!leave) return res.status(404).json({error: 'Leave not found'});

        const applicantRole = leave.applicant.role;
        const approverRole = req.user.role;

        if(applicantRole === 'employee' && approverRole !== 'hr'){
            return res.status(403).json({error: 'Only HR can reject/cancel employee leaves'});
        } 
        else if(applicantRole === 'hr' && approverRole !== 'management'){
            return res.status(403).json({ error: 'Only Management can reject/cancel HR leaves'});
        } 
        else if(applicantRole !== 'employee' && applicantRole !== 'hr'){
            return res.status(403).json({error: 'Rejections for this applicant role are not supported'});
        }

        const applicant = await User.findById(leave.applicant._id);

        if(leave.status === 'approved'){
            if(applicant){
                applicant.leaveBalance += leave.workingDays;
                await applicant.save();
            }
            leave.status = 'cancelled';  
        } 
        else if(leave.status === 'pending'){
            leave.status = 'rejected';
        } 
        else{
            return res.status(400).json({error: 'Leave is neither pending nor approved'});
        }

        leave.approver = req.user._id;
        leave.updatedAt = new Date();
        await leave.save();

        res.json({message: `Leave ${leave.status}`, leave});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};

