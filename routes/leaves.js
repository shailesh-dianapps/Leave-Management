const express = require('express');
const {auth, permit} = require('../middleware/auth');
const {requestLeave, getLeaves, approveLeave, rejectLeave, getPendingLeaves, getRejectedLeaves, getApprovedLeaves, getMyPendingLeaves, getMyApprovedLeaves, getMyRejectedLeaves} = require('../controllers/leaveController');

const router = express.Router();

router.post('/', auth, permit('employee', 'hr'), requestLeave);
router.get('/', auth, getLeaves);

// own leaves of hr and emp
router.get('/my/approved', auth, getMyApprovedLeaves);
router.get('/my/rejected', auth, getMyRejectedLeaves);
router.get('/my/pending', auth, getMyPendingLeaves);

// hr can see emp leaves
// management can see hr leaves
router.get('/approved', auth, permit('hr', 'management'), getApprovedLeaves);
router.get('/rejected', auth, permit('hr', 'management'), getRejectedLeaves);
router.get('/pending', auth, permit('hr', 'management'), getPendingLeaves);

router.put('/:id/approve', auth, permit('hr', 'management'), approveLeave);
router.put('/:id/reject', auth, permit('hr', 'management'), rejectLeave);

module.exports = router;
