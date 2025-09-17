const User = require('../models/user');

exports.getAllUsers = async (req, res) => {
    try{
        let filter = {};

        if(req.user.role === 'hr'){
            filter.role = 'employee';
        } 
        else if(req.user.role === 'management'){
            filter.role = {$in: ['employee', 'hr']};
        } 
        else{
            return res.status(403).json({error: 'Forbidden'});
        }

        const users = await User.find(filter).select('-password').sort({role: 1, name: 1});
        res.json({users});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};

exports.getUserById = async (req, res) => {
    try{
        const id = req.params.id;
        if(req.user.role === 'employee' && !req.user._id.equals(id)){
            return res.status(403).json({error: 'Forbidden'});
        }
        const user = await User.findById(id).select('-password');
        if(!user) return res.status(404).json({error: 'Not found'});

        res.json({user});
    } 
    catch(err){
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
};
