const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
    date: {type: Date, required: true, index: true},
    name: {type: String, required: true},
    createdBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
}, {timestamps: true});

module.exports = mongoose.model('PublicHoliday', holidaySchema);
