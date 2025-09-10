const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true, lowercase: true, unique: true, index: true},
    password: {type: String, required: true},
    role: {type: String, enum: ['employee', 'hr', 'management'], default: 'employee'},
    leaveBalance: {type: Number, default: 2},
    joinedAt: {type: Date, default: Date.now}
}, {timestamps: true});


userSchema.methods.comparePassword = function(pswd){
    return bcrypt.compare(pswd, this.password);
};

module.exports = mongoose.model('User', userSchema);
