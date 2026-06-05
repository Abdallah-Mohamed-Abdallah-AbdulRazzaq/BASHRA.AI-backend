const express = require('express');
const router = express.Router();
const AdminDoctorManagementController = require('../controllers/AdminDoctorManagementController');
const { parseFormData } = require('../middleware/formDataMiddleware');
const { 
  authenticateJWT, 
  authorizeSystemAdmin,
  authorizeAnyAdmin,
  adminActionLogger 
} = require('../middleware/authMiddleware');

/**
 * Admin Doctor Management Routes
 * مسارات إدارة الأطباء للأدمن
 * Base path: /api/admin/doctors
 */

// Apply form-data middleware to all routes
router.use(parseFormData);

// All routes require authentication and admin authorization
router.use(authenticateJWT, authorizeAnyAdmin);

/**
 * @route   GET /api/admin/doctors
 * @desc    Get all doctors with filters and pagination
 * @access  Private (Admin only)
 * @query   {
 *            page: number (default: 1),
 *            limit: number (default: 20),
 *            status: 'active' | 'inactive' | 'suspended' | 'pending_verification',
 *            approval_status: 'pending' | 'approved' | 'rejected' | 'suspended',
 *            is_verified: 'true' | 'false',
 *            search: string (email, phone, name, license_number),
 *            sort_by: 'created_at' | 'email' | 'status' | 'approval_status' | 'is_verified' | 'rating_average',
 *            sort_order: 'ASC' | 'DESC'
 *          }
 */
router.get('/', AdminDoctorManagementController.getAllDoctors);

/**
 * @route   GET /api/admin/doctors/pending
 * @desc    Get doctors pending approval
 * @access  Private (Admin only)
 * @query   { page: number, limit: number }
 */
router.get('/pending', AdminDoctorManagementController.getPendingDoctors);

/**
 * @route   GET /api/admin/doctors/statistics
 * @desc    Get doctor statistics for admin dashboard
 * @access  Private (Admin only)
 */
router.get('/statistics', AdminDoctorManagementController.getDoctorStatistics);

/**
 * @route   GET /api/admin/doctors/:doctorId
 * @desc    Get single doctor details
 * @access  Private (Admin only)
 */
router.get('/:doctorId', AdminDoctorManagementController.getDoctorDetails);

// System Admin and above only for modification operations
router.use(authorizeSystemAdmin);

/**
 * @route   PATCH /api/admin/doctors/:doctorId/status
 * @desc    Update doctor status (active, inactive, suspended, pending_verification)
 * @access  Private (System Admin and above)
 * @body    { status: string, reason?: string }
 */
router.patch('/:doctorId/status',
  adminActionLogger('UPDATE_DOCTOR_STATUS', (req) => ({
    targetType: 'doctor',
    targetId: req.params.doctorId,
    newValues: { status: req.body.status, reason: req.body.reason }
  })),
  AdminDoctorManagementController.updateDoctorStatus
);

/**
 * @route   PATCH /api/admin/doctors/:doctorId/verify
 * @desc    Verify or unverify doctor profile (is_verified, verification_date, verified_by)
 * @access  Private (System Admin and above)
 * @body    { is_verified: boolean, reason?: string }
 */
router.patch('/:doctorId/verify',
  adminActionLogger('VERIFY_DOCTOR_PROFILE', (req) => ({
    targetType: 'doctor_profile',
    targetId: req.params.doctorId,
    newValues: { is_verified: req.body.is_verified, reason: req.body.reason }
  })),
  AdminDoctorManagementController.verifyDoctorProfile
);

/**
 * @route   PATCH /api/admin/doctors/:doctorId/verification-status
 * @desc    Update comprehensive verification status (is_verified, verification_date, verified_by, approval_status)
 * @access  Private (System Admin and above)
 * @body    { is_verified: boolean, approval_status?: string, reason?: string }
 */
router.patch('/:doctorId/verification-status',
  adminActionLogger('UPDATE_DOCTOR_VERIFICATION_STATUS', (req) => ({
    targetType: 'doctor_profile',
    targetId: req.params.doctorId,
    newValues: { 
      is_verified: req.body.is_verified, 
      approval_status: req.body.approval_status,
      reason: req.body.reason 
    }
  })),
  AdminDoctorManagementController.updateDoctorVerificationStatus
);

/**
 * @route   PATCH /api/admin/doctors/:doctorId/approval
 * @desc    Update doctor approval status (pending, approved, rejected, suspended)
 * @access  Private (System Admin and above)
 * @body    { approval_status: string, reason?: string }
 */
router.patch('/:doctorId/approval',
  adminActionLogger('UPDATE_DOCTOR_APPROVAL', (req) => ({
    targetType: 'doctor_profile',
    targetId: req.params.doctorId,
    newValues: { approval_status: req.body.approval_status, reason: req.body.reason }
  })),
  AdminDoctorManagementController.updateDoctorApprovalStatus
);

/**
 * @route   POST /api/admin/doctors/:doctorId/approve
 * @desc    Approve doctor (combined: status=active, is_verified=true, approval_status=approved)
 * @access  Private (System Admin and above)
 * @body    { reason?: string }
 */
router.post('/:doctorId/approve',
  adminActionLogger('APPROVE_DOCTOR', (req) => ({
    targetType: 'doctor',
    targetId: req.params.doctorId,
    newValues: { action: 'approve', reason: req.body.reason }
  })),
  AdminDoctorManagementController.approveDoctor
);

/**
 * @route   POST /api/admin/doctors/:doctorId/reject
 * @desc    Reject doctor (combined: status=inactive, approval_status=rejected)
 * @access  Private (System Admin and above)
 * @body    { reason: string } (required)
 */
router.post('/:doctorId/reject',
  adminActionLogger('REJECT_DOCTOR', (req) => ({
    targetType: 'doctor',
    targetId: req.params.doctorId,
    newValues: { action: 'reject', reason: req.body.reason }
  })),
  AdminDoctorManagementController.rejectDoctor
);

/**
 * @route   POST /api/admin/doctors/:doctorId/suspend
 * @desc    Suspend doctor (combined: status=suspended, approval_status=suspended)
 * @access  Private (System Admin and above)
 * @body    { reason: string } (required)
 */
router.post('/:doctorId/suspend',
  adminActionLogger('SUSPEND_DOCTOR', (req) => ({
    targetType: 'doctor',
    targetId: req.params.doctorId,
    newValues: { action: 'suspend', reason: req.body.reason }
  })),
  AdminDoctorManagementController.suspendDoctor
);

/**
 * @route   POST /api/admin/doctors/bulk/status
 * @desc    Bulk update doctors status
 * @access  Private (System Admin and above)
 * @body    { doctorIds: number[], status: string, reason?: string }
 */
router.post('/bulk/status',
  adminActionLogger('BULK_UPDATE_DOCTORS_STATUS', (req) => ({
    targetType: 'doctors',
    newValues: { doctorIds: req.body.doctorIds, status: req.body.status, reason: req.body.reason }
  })),
  AdminDoctorManagementController.bulkUpdateDoctorsStatus
);

module.exports = router;
