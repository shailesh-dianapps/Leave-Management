const jwt = require('jsonwebtoken');
const User = require('../models/user');
const BlacklistedToken = require('../models/BlacklistedToken');

const auth = async (req, res, next) => {
    try{
        const header = req.headers.authorization;
        if(!header || !header.startsWith('Bearer')) return res.status(401).json({error: 'Missing token'});
        const token = header.split(' ')[1];

        const blacklisted = await BlacklistedToken.findOne({token});
        if(blacklisted) return res.status(401).json({error: 'Token revoked (logout)'});

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if(!user) return res.status(401).json({error: 'User not found'});

        req.user = user;
        req.token = token; 
        next();
    } 
    catch(err){
        console.error('auth middleware error', err);
        return res.status(401).json({error: 'Unauthorized'});
    }
};

const permit = (...allowedRoles) => {
    return (req, res, next) => {
        if(!req.user) return res.status(401).json({error: 'Unauthorized'});
        if(!allowedRoles.includes(req.user.role)) return res.status(403).json({error: 'Forbidden'});
        next();
    };
};

module.exports = {auth, permit};
