const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Session = require('../models/sessionModel');

exports.register = async (req, res) => {
    try{
        const {name, email, password, role} = req.body;
        if(!name || !email || !password) return res.status(400).json({error: 'Missing fields'});

        const emailRegex = /^[A-Za-z0-9._%+-]{2,}@[A-Za-z0-9.-]{2,}\.[A-Za-z]{2,}$/;
        if(!emailRegex.test(email)) return res.status(400).json({error: "Invalid email format."});
        if(password.length < 8) return res.status(400).json({error: 'Invalid Password Format'});
        if(name.length <= 2) return res.status(400).json({error: 'Invalid Name Format'});

        const existing = await User.findOne({email});
        if(existing) return res.status(400).json({error: 'Email already registered'});

        const hash = await bcrypt.hash(password, 10);
        const user = new User({name, email, password: hash, role: role || 'employee', leaveBalance: 2});
        await user.save();

        res.json({message: 'Registered', user: {id: user._id, name: user.name, email: user.email, role: user.role, leaveBalance: user.leaveBalance}});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};

exports.login = async (req, res) => {
    try{
        const {email, password} = req.body;
        if(!email || !password) return res.status(400).json({error: 'Missing fields'});

        const emailRegex = /^[A-Za-z0-9._%+-]{2,}@[A-Za-z0-9.-]{2,}\.[A-Za-z]{2,}$/;
        if(!emailRegex.test(email)) return res.status(400).json({error: "Invalid email format."});
        if(password.length < 8) return res.status(400).json({error: 'Invalid Password Format'});

        const user = await User.findOne({email});
        if(!user) return res.status(400).json({error: 'Invalid credentials'});

        const ok = await bcrypt.compare(password, user.password);
        if(!ok) return res.status(401).json({error: 'Invalid credentials'}); 

        const token = jwt.sign({id: user._id, role: user.role}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN});

        await Session.create({userId: user._id, token});

        res.json({
            token, 
            user: {
                id: user._id, 
                name: user.name, 
                email: user.email, 
                role: user.role, 
                leaveBalance: user.leaveBalance
            }
        });
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};

exports.logout = async (req, res) => {
    try {
        const token = req.token;
        if(!token) return res.status(400).json({error: 'Token not provided'});
        await Session.findOneAndDelete({token});
        return res.json({message: 'Logged out successfully'});
    }
    catch(err){
        console.error('Logout error', err);
        res.status(500).json({error: 'Server error'});
    }
};
