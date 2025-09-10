const mongoose = require('mongoose');

const blacklistedTokenSchema = new mongoose.Schema({
    token: {type: String, required: true, unique: true},
    expiresAt: {type: Date, required: true},
});

// Auto-remove expired tokens using MongoDB TTL index
blacklistedTokenSchema.index({expiresAt: 1}, {expireAfterSeconds: 0});

module.exports = mongoose.model('BlacklistedToken', blacklistedTokenSchema);
