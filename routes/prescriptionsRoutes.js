const express = require('express');
const router = express.Router();
const PrescriptionsController = require('../controllers/prescriptionsController');
const { authenticateJWT, authorizeDoctor } = require('../middleware/authMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Prescriptions Routes
 * Base Path: /api/prescriptions
 */

router.get('/', authenticateJWT, PrescriptionsController.getAllPrescriptions);
router.get('/list', authenticateJWT, PrescriptionsController.getAllPrescriptions);
router.get('/medical-record/:recordId', authenticateJWT, PrescriptionsController.getPrescriptionsByMedicalRecord);
router.get('/:id', authenticateJWT, PrescriptionsController.getPrescriptionById);

router.post('/', authenticateJWT, authorizeDoctor, parseFormData, PrescriptionsController.createPrescription);
router.put('/:id', authenticateJWT, authorizeDoctor, parseFormData, PrescriptionsController.updatePrescription);
router.patch('/:id/cancel', authenticateJWT, authorizeDoctor, PrescriptionsController.cancelPrescription);
router.patch('/:id/fill', authenticateJWT, PrescriptionsController.fillPrescription);
router.post('/:id/translations', authenticateJWT, authorizeDoctor, parseFormData, PrescriptionsController.updateTranslation);

module.exports = router;







































// const express = require('express');
// const router = express.Router();
// const PrescriptionsController = require('../controllers/prescriptionsController');
// const { authenticateJWT, authorizeDoctor } = require('../middleware/authMiddleware');
// const { parseFormData } = require('../middleware/formDataMiddleware');

// /**
//  * Prescriptions Routes
//  * Base Path: /api/prescriptions
//  * 
//  * Doctor: Create, Update, Cancel
//  * Patient & Doctor: View their own prescriptions
//  * Pharmacy: Fill prescriptions
//  */

// /**
//  * @route   GET /api/prescriptions
//  * @desc    Get all prescriptions (filtered by user role)
//  * @access  Private (Patient, Doctor, Admin)
//  * @query   patient_id, status, medical_record_id, page, limit
//  */
// router.get('/', authenticateJWT, PrescriptionsController.getAllPrescriptions);

// /**
//  * @route   GET /api/prescriptions/medical-record/:recordId
//  * @desc    Get prescriptions by medical record
//  * @access  Private (Patient, Doctor, Admin)
//  */
// router.get('/medical-record/:recordId', authenticateJWT, PrescriptionsController.getPrescriptionsByMedicalRecord);

// /**
//  * @route   GET /api/prescriptions/:id
//  * @desc    Get single prescription by ID or UUID
//  * @access  Private (Patient, Doctor, Admin)
//  */
// router.get('/:id', authenticateJWT, PrescriptionsController.getPrescriptionById);

// /**
//  * @route   POST /api/prescriptions
//  * @desc    Create new prescription
//  * @access  Private (Doctor only)
//  * @body    {
//  *            medical_record_id: number (required),
//  *            patient_id: number (required),
//  *            medication_name: "string (required)",
//  *            dosage: "string (required)",
//  *            frequency: "string (required)",
//  *            duration: "string (optional)",
//  *            quantity: "string (optional)",
//  *            route_of_administration: "string (optional)",
//  *            refills_allowed: number (optional, default: 0),
//  *            is_generic_allowed: boolean (optional, default: true),
//  *            expiry_date: "date (optional)",
//  *            translations: {
//  *              "ar": {
//  *                "instructions": "text",
//  *                "indication": "text",
//  *                "pharmacy_notes": "text"
//  *              },
//  *              "en": {...}
//  *            }
//  *          }
//  */
// router.post('/', authenticateJWT, authorizeDoctor, parseFormData, PrescriptionsController.createPrescription);

// /**
//  * @route   PUT /api/prescriptions/:id
//  * @desc    Update prescription
//  * @access  Private (Doctor only)
//  * @body    Same as POST (all fields optional)
//  */
// router.put('/:id', authenticateJWT, authorizeDoctor, parseFormData, PrescriptionsController.updatePrescription);

// /**
//  * @route   PATCH /api/prescriptions/:id/cancel
//  * @desc    Cancel prescription
//  * @access  Private (Doctor only)
//  */
// router.patch('/:id/cancel', authenticateJWT, authorizeDoctor, PrescriptionsController.cancelPrescription);

// /**
//  * @route   PATCH /api/prescriptions/:id/fill
//  * @desc    Mark prescription as filled (for pharmacy use)
//  * @access  Private (Authenticated)
//  */
// router.patch('/:id/fill', authenticateJWT, PrescriptionsController.fillPrescription);

// /**
//  * @route   POST /api/prescriptions/:id/translations
//  * @desc    Add/Update prescription translation
//  * @access  Private (Doctor only)
//  * @body    {
//  *            language_code: "string (required: ar, en)",
//  *            instructions: "text (optional)",
//  *            indication: "text (optional)",
//  *            pharmacy_notes: "text (optional)"
//  *          }
//  */
// router.post('/:id/translations', authenticateJWT, authorizeDoctor, parseFormData, PrescriptionsController.updateTranslation);

// module.exports = router;
