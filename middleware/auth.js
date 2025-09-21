const jwt = require('jsonwebtoken');
const Session = require('../models/sessionModel');

exports.auth = async (req, res, next) => {
    try{
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        if(!token) return res.status(401).json({error: "No token provided"});

        let payload;

        try{
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } 
        catch(err){
            return res.status(403).json({error: "Invalid token"});
        }

        const session = await Session.findOne({userId: payload.id, token});
        if(!session){
            return res.status(401).json({ error: "Session expired or replaced"});
        }

        // Normalize user object
        req.user = {...payload, _id: payload.id};
        next();
    }
    catch(err){
        return res.status(500).json({message: err.message})
    }
};

exports.permit = (...allowedRoles) => {
    return (req, res, next) => {
        if(!req.user) return res.status(401).json({error: 'Unauthorized'});
        if(!allowedRoles.includes(req.user.role)) return res.status(403).json({error: 'Forbidden'});
        next();
    };
};


