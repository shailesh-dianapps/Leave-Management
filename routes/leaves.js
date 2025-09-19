const express = require('express');
const {auth, permit} = require('../middleware/auth');
const {requestLeave, getLeaves, approveLeave, rejectLeave, getPendingLeaves, getRejectedLeaves, getApprovedLeaves, getMyPendingLeaves, getMyApprovedLeaves, getMyRejectedLeaves} = require('../controllers/leaveController');

const router = express.Router();

router.post('/', auth, requestLeave);
router.get('/', auth, getLeaves);

router.get('/my/approved', auth, getMyApprovedLeaves);
router.get('/my/rejected', auth, getMyRejectedLeaves);
router.get('/my/pending', auth, getMyPendingLeaves);

router.get('/approved', auth, permit('hr', 'management'), getApprovedLeaves);
router.get('/rejected', auth, permit('hr', 'management'), getRejectedLeaves);
router.get('/pending', auth, permit('hr', 'management'), getPendingLeaves);

router.put('/:id/approve', auth, permit('hr', 'management'), approveLeave);
router.put('/:id/reject', auth, permit('hr', 'management'), rejectLeave);

module.exports = router;
