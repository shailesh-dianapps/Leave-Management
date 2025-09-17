const mongoose = require('mongoose')

const sessionSchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    token : {type: String, default: null},
}, {timestamps: true})

module.exports = mongoose.model("Session", sessionSchema)