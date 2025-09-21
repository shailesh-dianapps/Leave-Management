const User = require('../models/user');

exports.getAllUsers = async (req, res) => {
    try{
        let filter = {};

        if(req.user.role === 'employee'){
            // Employee can see only themselves
            filter._id = req.user._id;
        }
        else if(req.user.role === 'hr'){
            // HR can see only employees and themselves
            filter.$or = [{role: 'employee'}, {_id: req.user._id}];
        }
        else if(req.user.role === 'management'){
            // Management can see everyone
            filter = {}; 
        } 
        else{
            return res.status(403).json({error: 'Forbidden'});
        }

        let {page, limit} = req.query;
        page = parseInt(page) || 1;  
        limit = parseInt(limit) || 10; 
        const skip = (page - 1) * limit;

        const users = await User.find(filter).select('-password')
            .sort({role: 1, name: 1}) .skip(skip).limit(limit);

        const totalUsers = await User.countDocuments(filter);

        res.json({totalUsers, page, totalPages: Math.ceil(totalUsers/limit), users});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};

exports.getUserById = async (req, res) => {
    try{
        const id = req.params.id;
        const user = await User.findById(id).select('-password');
        if(!user) return res.status(404).json({error: 'Not found'});

        if(req.user.role === 'employee' && !req.user._id.equals(id)){
            // Employee can see only themselves
            return res.status(403).json({error: 'Forbidden'});
        }

        if(req.user.role === 'hr' && user.role !== 'employee' && !user._id.equals(req.user._id)){
            // HR can see only employees and themselves
            return res.status(403).json({error: 'Forbidden'});
        }

        // Management can see anyone, no restriction needed
        res.json({user});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};
