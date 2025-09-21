const express = require('express');
const {auth, permit} = require('../middleware/auth');
const {requestLeave, rejectLeaveRequest, approveLeaveRequest, getPendingLeaves, getRejectedLeaves, getApprovedLeaves, getMyPendingLeaves, getMyApprovedLeaves, getMyRejectedLeaves} = require('../controllers/leaveController');

const router = express.Router();

router.post('/', auth, permit('employee', 'hr'), requestLeave);

// own leaves of hr and emp
router.get('/my/pending', auth, getMyPendingLeaves);
router.get('/my/approved', auth, getMyApprovedLeaves);
router.get('/my/rejected', auth, getMyRejectedLeaves);

// hr can see emp leaves
// management can see hr leaves
router.get('/pending', auth, permit('hr', 'management'), getPendingLeaves);
router.get('/approved', auth, permit('hr', 'management'), getApprovedLeaves);
router.get('/rejected', auth, permit('hr', 'management'), getRejectedLeaves);

router.put('/:id/approve', auth, permit('hr', 'management'), approveLeaveRequest);
router.put('/:id/reject', auth, permit('hr', 'management'), rejectLeaveRequest);

module.exports = router;
