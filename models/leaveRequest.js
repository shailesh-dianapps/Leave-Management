const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    applicant: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    leaveType: {type: String, required: true}, 
    startDate: {type: Date, required: true},
    endDate: {type: Date, required: true},
    workingDays: {type: Number, required: true},
    comment: {type: String},
    status: {type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending'},
    approver: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
}, {timestamps: true});

module.exports = mongoose.model('LeaveRequest', leaveSchema);
