const express = require('express');
const LeaveRequest = require('../models/leaveRequest');
const PublicHoliday = require('../models/publicHoliday');
const User = require('../models/user');
const {auth, permit} = require('../middleware/auth');

const router = express.Router();

function normalize(d){
    const dt = new Date(d);
    dt.setHours(0,0,0,0);
    return dt;
}

async function computeWorkingDays(start, end) {
    const s = normalize(start);
    const e = normalize(end);
    if(s > e) return 0;
    const holidays = await PublicHoliday.find({date: {$gte: s, $lte: e}}).select('date -_id');
    const holidaySet = new Set(holidays.map(h => normalize(h.date).toISOString()));
    let count = 0;

    for(let d=new Date(s); d<=e; d.setDate(d.getDate()+1)){
        const day = d.getDay();
        if(day===0 || day===6) continue;
        if(holidaySet.has(normalize(d).toISOString())) continue;
        count++;
    }
    return count;
}

router.post('/', auth, async (req, res) => {
    try{
        const {leaveType, startDate, endDate, comment} = req.body;
        if(!startDate || !endDate || !leaveType) return res.status(400).json({error: 'Missing fields'});
        const start = new Date(startDate);
        const end = new Date(endDate);
        if(start > end) return res.status(400).json({error: 'startDate cannot be after endDate'});

        const workingDays = await computeWorkingDays(start, end);
        if(workingDays <= 0) return res.status(400).json({error: 'No working days in selected range'});

        const leave = new LeaveRequest({
            applicant: req.user._id,
            leaveType,
            startDate: normalize(start),
            endDate: normalize(end),
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
});

router.get('/', auth, async (req, res) => {
    try{
        const role = req.user.role;
        let leaves;
        if(role === 'employee'){
            leaves = await LeaveRequest.find({applicant: req.user._id}).populate('applicant approver', 'name email role');
        } 
        else if(role === 'hr'){
            leaves = await LeaveRequest.find({$or: [{applicant: req.user._id}, {status: 'pending'}]}).populate('applicant approver', 'name email role');
        } 
        else if(role === 'management'){
            leaves = await LeaveRequest.find().populate('applicant approver', 'name email role');
        } 
        else leaves = [];
        res.json({leaves});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
});

router.post('/:id/approve', auth, async (req, res) => {
    try{
        const leave = await LeaveRequest.findById(req.params.id).populate('applicant');
        if(!leave) return res.status(404).json({error: 'Leave not found'});
        if(leave.status !== 'pending') return res.status(400).json({error: 'Leave not pending'});

        const applicantRole = leave.applicant.role;
        const approverRole = req.user.role;

        if(applicantRole === 'employee'){
            if(approverRole !== 'hr') return res.status(403).json({error: 'Only HR can approve employee leaves'});
        } 
        else if(applicantRole === 'hr'){
            if(approverRole !== 'management') return res.status(403).json({error: 'Only Management can approve HR leaves'});
        } 
        else{
            return res.status(403).json({error: 'Approvals for this applicant role are not supported'});
        }

        const applicant = await User.findById(leave.applicant._id);
        if(!applicant) return res.status(404).json({error: 'Applicant not found'});

        if(applicant.leaveBalance < leave.workingDays){
            return res.status(400).json({error: 'Insufficient leave balance'});
        }

        applicant.leaveBalance = applicant.leaveBalance - leave.workingDays;
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
});

router.post('/:id/reject', auth, async (req, res) => {
    try{
        const leave = await LeaveRequest.findById(req.params.id).populate('applicant');
        if(!leave) return res.status(404).json({error: 'Leave not found'});
        if(leave.status !== 'pending') return res.status(400).json({error: 'Leave not pending'});

        const applicantRole = leave.applicant.role;
        const approverRole = req.user.role;

        if(applicantRole === 'employee'){
            if(approverRole !== 'hr') return res.status(403).json({error: 'Only HR can reject employee leaves'});
        } 
        else if(applicantRole === 'hr'){
            if(approverRole !== 'management') return res.status(403).json({error: 'Only Management can reject HR leaves'});
        } 
        else{
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
});

// monthly accrual remains as previously (HR/management can call)
router.post('/accrue/monthly', auth, async (req, res) => {
    try{
        if(!['hr','management'].includes(req.user.role)) return res.status(403).json({error: 'Only HR or Management can run accrual'});
        const add = 2;
        const result = await User.updateMany({}, {$inc: {leaveBalance: add}});
        const modified = result.nModified ?? result.modifiedCount ?? 0;
        res.json({message: `Added ${add} days to all users`, modifiedCount: modified});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
});

module.exports = router;
