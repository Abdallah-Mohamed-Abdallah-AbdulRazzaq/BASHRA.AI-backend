const express = require("express");
const router = express.Router();

// Import existing routes
const authUserRoutes = require("./authUserRoutes");
const authAdminRoutes = require("./authAdminRoutes");
const authDoctorRoutes = require("./authDoctorRoutes");
const authAssistantRoutes = require("./authAssistantRoutes");

// Import new health tips routes
const healthTipsRoutes = require("./healthTipsRoutes");
const advancedHealthRoutes = require("./advancedHealthRoutes");

// Import profile routes (مسارات الملفات الشخصية)
const profileUserRoutes = require("./profileUserRoutes");
const profileDoctorRoutes = require("./profileDoctorRoutes");
const profileAssistantRoutes = require("./profileAssistantRoutes");
const profileAdminRoutes = require("./profileAdminRoutes");

// Import doctor professional and verification routes (مسارات البيانات المهنية ومستندات التحقق للأطباء)
const doctorProfessionalRoutes = require("./doctorProfessionalRoutes");
const doctorVerificationDocumentsRoutes = require("./doctorVerificationDocumentsRoutes");

// Import patient profile routes (مسارات ملفات المرضى)
const patientProfileRoutes = require("./patientProfileRoutes");

// Import files management routes (مسارات إدارة الملفات)
const filesRoutes = require("./filesRoutes");

// Import conversations routes (مسارات المحادثات)
const conversationsRoutes = require("./conversationsRoutes");

// Import chat users routes (مسارات مستخدمي الشات)
const chatUsersRoutes = require("./chatUsersRoutes");

// Import address routes (مسارات العناوين)
const addressRoutes = require("./addressRoutes");
const countriesCitiesRoutes = require("./countriesCitiesRoutes");

// Import doctors by location routes (مسارات الأطباء حسب الموقع)
const doctorsByLocationRoutes = require("./doctorsByLocationRoutes");

// Import clinics routes (مسارات العيادات)
const clinicsRoutes = require("./clinicsRoutes");
const publicClinicsRoutes = require("./publicClinicsRoutes");
const userClinicsRoutes = require("./userClinicsRoutes");

// Import doctor contact details routes (مسارات معلومات التواصل للأطباء)
const doctorContactDetailsRoutes = require("./doctorContactDetailsRoutes");

// Import doctor subscriptions routes (مسارات اشتراكات الأطباء)
const doctorSubscriptionsRoutes = require("./doctorSubscriptionsRoutes");

// Import subscription management routes (مسارات إدارة الباقات والاشتراكات - Admin only)
const featuresRoutes = require("./featuresRoutes");
const packagesRoutes = require("./packagesRoutes");
const packageFeaturesRoutes = require("./packageFeaturesRoutes");

// Import public packages routes (مسارات الباقات العامة - Public)
const publicPackagesRoutes = require("./publicPackagesRoutes");
const publicFeaturesRoutes = require("./publicFeaturesRoutes");

// Import medications and prescriptions routes (مسارات الأدوية والوصفات الطبية)
const medicationsRoutes = require("./medicationsRoutes");
const prescriptionTemplatesRoutes = require("./prescriptionTemplatesRoutes");
const prescriptionsRoutes = require("./prescriptionsRoutes");

// Import ratings routes (مسارات التقييمات)
const ratingsRoutes = require("./ratingsRoutes");

// Import doctor schedules routes (مسارات جداول مواعيد الأطباء)
const doctorSchedulesRoutes = require("./doctorSchedulesRoutes");
const publicDoctorSchedulesRoutes = require("./publicDoctorSchedulesRoutes");

// Import appointments routes (مسارات المواعيد)
const patientAppointmentsRoutes = require("./patientAppointmentsRoutes");
const doctorAppointmentsRoutes = require("./doctorAppointmentsRoutes");
const adminAppointmentsRoutes = require("./adminAppointmentsRoutes");

// Import medical records routes (مسارات السجلات الطبية)
const patientMedicalRecordsRoutes = require("./patientMedicalRecordsRoutes");
const doctorMedicalRecordsRoutes = require("./doctorMedicalRecordsRoutes");
const adminMedicalRecordsRoutes = require("./adminMedicalRecordsRoutes");

// Import admin doctor management routes (مسارات إدارة الأطباء للأدمن)
const adminDoctorManagementRoutes = require("./adminDoctorManagementRoutes");
const adminAIUsageRoutes = require("./adminAIUsageRoutes");
const adminDoctorProfileManagementRoutes = require("./adminDoctorProfileManagementRoutes");

// Import blocked entities routes (مسارات الكيانات المحظورة)
const blockedEntitiesRoutes = require("./blockedEntitiesRoutes");

// Import admin user management routes (مسارات إدارة المستخدمين للأدمن)
const adminUserManagementRoutes = require("./adminUserManagementRoutes");

const aiDermatologyRoutes = require("./aiDermatologyRoutes");





// Authentication routes
router.use("/auth-user", authUserRoutes);
router.use("/auth-admin", authAdminRoutes);
router.use("/auth-doctor", authDoctorRoutes);
router.use("/auth-assistant", authAssistantRoutes);


// Profiles routes (الملفات الشخصية)
router.use("/profile-user", profileUserRoutes);

// Doctor Professional Data routes (البيانات المهنية للأطباء) - يجب أن تأتي قبل profile-doctor
router.use("/profile-doctor/professional", doctorProfessionalRoutes);

// Doctor Verification Documents routes (مستندات التحقق للأطباء) - يجب أن تأتي قبل profile-doctor
router.use("/profile-doctor/verification-documents", doctorVerificationDocumentsRoutes);

// Doctor Profile routes (الملف الشخصي للأطباء)
router.use("/profile-doctor", profileDoctorRoutes);

router.use("/profile-assistant", profileAssistantRoutes);
router.use("/profile-admin", profileAdminRoutes);

// Patient profiles routes (ملفات المرضى)
router.use("/patient-profiles", patientProfileRoutes);



// Files management routes (إدارة الملفات - Admin only)
router.use("/files", filesRoutes);



// Health tips routes (النصائح الصحية)
router.use("/health-tips", healthTipsRoutes);
// Advanced health tips routes (العمليات المتقدمة للنصائح الصحية)
router.use("/health-tips/advanced", advancedHealthRoutes);



// Conversations routes (المحادثات)
router.use("/conversations", conversationsRoutes);
// Chat users routes (مستخدمو الشات)
router.use("/chat-users", chatUsersRoutes);


// Address routes (العناوين)
router.use("/addresses", addressRoutes);
// Countries & Cities routes (الدول والمدن)
router.use("/countries-cities", countriesCitiesRoutes);

// Doctors by Location routes (الأطباء حسب الموقع - Public)
router.use("/doctors-by-location", doctorsByLocationRoutes);

// Clinics routes (العيادات - Doctor only) 
router.use("/clinics", clinicsRoutes);

// Public Clinics routes (العيادات العامة - Public, No Auth)
router.use("/public/clinics", publicClinicsRoutes);

// User Clinics routes (العيادات للمستخدمين - User Auth)
router.use("/user/clinics", userClinicsRoutes);

// Doctor Contact Details routes (معلومات التواصل للأطباء)
router.use("/doctor-contact-details", doctorContactDetailsRoutes);

// Doctor Subscriptions routes (اشتراكات الأطباء)
router.use("/doctor-subscriptions", doctorSubscriptionsRoutes);

// Subscription Management routes (إدارة الباقات والاشتراكات - Admin only)
router.use("/features", featuresRoutes);
router.use("/packages", packagesRoutes);
router.use("/package-features", packageFeaturesRoutes);

// Public Packages routes (الباقات العامة - Public, No Auth)
router.use("/public/packages", publicPackagesRoutes);
router.use("/public/features", publicFeaturesRoutes);

// Medications and Prescriptions routes (الأدوية والوصفات الطبية)
router.use("/medications", medicationsRoutes);
router.use("/prescription-templates", prescriptionTemplatesRoutes);
router.use("/prescriptions", prescriptionsRoutes);

// Ratings routes (مسارات التقييمات)
router.use("/ratings", ratingsRoutes);

// Doctor Schedules routes (جداول مواعيد الأطباء - Doctor only)
router.use("/doctor-schedules", doctorSchedulesRoutes);

// Public Doctor Schedules routes (جداول مواعيد الأطباء العامة - Public, No Auth)
router.use("/public/doctor-schedules", publicDoctorSchedulesRoutes);

// Appointments routes (المواعيد)
router.use("/patient/appointments", patientAppointmentsRoutes); // Patient appointments
router.use("/doctor/appointments", doctorAppointmentsRoutes); // Doctor appointments
router.use("/admin/appointments", adminAppointmentsRoutes); // Admin appointments

// Medical Records routes (السجلات الطبية)
router.use("/patient/medical-records", patientMedicalRecordsRoutes); // Patient medical records
router.use("/doctor/medical-records", doctorMedicalRecordsRoutes); // Doctor medical records
router.use("/admin/medical-records", adminMedicalRecordsRoutes); // Admin medical records

// Admin Doctor Management routes (إدارة الأطباء للأدمن - Admin only)
router.use("/admin/doctors", adminDoctorManagementRoutes);

// Admin Doctor Profile Management routes (إدارة ملفات الأطباء للأدمن - Admin only)
router.use("/admin/doctors", adminDoctorProfileManagementRoutes);

// Blocked Entities routes (الكيانات المحظورة - Admin only)
router.use("/admin/blocked-entities", blockedEntitiesRoutes);

// Admin User Management routes (إدارة المستخدمين للأدمن - Admin only)
router.use("/admin/users", adminUserManagementRoutes);

// Admin AI Usage Management routes (إدارة استخدام الذكاء الاصطناعي للأدمن)
router.use("/admin/ai-usage", adminAIUsageRoutes);

// AI Dermatology routes - separate from normal chat
router.use("/ai-dermatology", aiDermatologyRoutes);


module.exports = router;


//  http://localhost:3006/api/auth/register