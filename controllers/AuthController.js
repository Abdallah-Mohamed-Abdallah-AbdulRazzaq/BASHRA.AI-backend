const SecurityService = require('../utils/SecurityService');
const { generateOtp, sendOtp } = require('../utils/otpUtils');
const { formatPhoneNumber, isValidPhoneNumber } = require('../utils/phoneUtils');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'auth-controller.log' })
  ]
});

class AuthController {
  
  /**
   * User/Admin/Doctor/Assistant Login
   */
  static async login(req, res) {
    const { email, password, entityType = 'user' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message_ar: 'البريد الإلكتروني وكلمة المرور مطلوبة',
        message_en: 'Email and password are required' 
      });
    }

    if (!['user', 'admin', 'doctor', 'assistant'].includes(entityType)) {
      return res.status(400).json({ 
        success: false, 
        message_ar: 'نوع العضو غير صحيح',
        message_en: 'Invalid entity type' 
      });
    }

    try {
      const result = await SecurityService.authenticate(email, password, entityType, req);

      if (!result.success) {
        return res.status(401).json(result);
      }

      // Require verified account for User / Doctor / Assistant
      if (
        entityType !== 'admin' &&
        !result.user.email_verified_at &&
        !result.user.phone_verified_at
      ) {
        try {
          // Generate and send new email OTP
          const emailOtp = generateOtp();
          const emailOtpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
          
          const tableName = entityType === 'user' ? 'users' : `${entityType}s`;
          
          // Store OTP in database
          await db.query(
            `UPDATE ${tableName} SET email_otp = ?, email_otp_expiry = ?, is_email_otp = 1 WHERE id = ?`,
            [emailOtp, emailOtpExpiry, result.user.id]
          );
          
          // Send email OTP
          await sendOtp(result.user.email, null, emailOtp, 'email');
          
          logger.info('New OTP sent for unverified account login attempt', { 
            userId: result.user.id, 
            email: result.user.email, 
            entityType 
          });
          
          return res.status(403).json({
            success: false,
            accountNotVerified: true,
            userId: result.user.id,
            message_ar: 'يرجى إتمام عملية التحقق أولاً عبر رمز التفعيل. تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني',
            message_en: 'Please verify your account first via OTP. A new verification code has been sent to your email',
            requiresVerification: {
              email: true,
              phone: !!result.user.phone && !result.user.phone_verified_at
            }
          });
        } catch (otpError) {
          logger.error('Failed to send OTP for unverified account', { 
            error: otpError.message, 
            userId: result.user.id, 
            entityType 
          });
          
          return res.status(403).json({
            success: false,
            accountNotVerified: true,
            userId: result.user.id,
            message_ar: 'يرجى إتمام عملية التحقق أولاً عبر رمز التفعيل',
            message_en: 'Please verify your account first via OTP',
          });
        }
      }

      res.json({
        success: true,
        message_ar: 'تم تسجيل الدخول بنجاح',
        message_en: 'Login successful',
        user: result.user,
        tokens: result.tokens
      });

    } catch (error) {
      logger.error('Login error', { error: error.message, email, entityType });
      res.status(500).json({ 
        success: false, 
        message_ar: 'حدث خطأ في الخادم',
        message_en: 'Internal server error' 
      });
    }
  }

  /**
   * Register new entity
   */
  static async register(req, res) {
    const { email, phone, password, entityType = 'user', adminType, full_name, language_code } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message_en: 'Email and password are required',
        message_ar: 'البريد الإلكتروني وكلمة المرور مطلوبة',
      });
    }

    if (!['user', 'admin', 'doctor', 'assistant'].includes(entityType)) {
      return res.status(400).json({ 
        success: false, 
        message_ar: 'نوع العضو غير صحيح',
        message_en: 'Invalid entity type', 
      });
    }

    if (entityType === 'admin' && !['super_admin', 'system_admin', 'clinic_admin'].includes(adminType)) {
      return res.status(400).json({ 
        success: false, 
        message_ar: 'نوع المسؤول غير صحيح',
        message_en: 'Invalid admin type' 
      });
    }

    // Validate phone if provided
    if (phone && !isValidPhoneNumber(phone)) {
      return res.status(400).json({ 
        success: false, 
        message_ar: 'رقم الهاتف غير صحيح',
        message_en: 'Invalid phone number format' 
      });
    }

    try {
      const tableName = entityType === 'user' ? 'users' : `${entityType}s`;
      
      // Check if email already exists
      const [existingEmail] = await db.query(
        `SELECT id FROM ${tableName} WHERE email = ?`,
        [email]
      );

      if (existingEmail.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message_ar: 'البريد الإلكتروني مسجل بالفعل',
          message_en: 'Email already registered' 
        });
      }

      // Check if phone already exists (if provided)
      if (phone) {
        const formattedPhone = formatPhoneNumber(phone);
        const [existingPhone] = await db.query(
          `SELECT id FROM ${tableName} WHERE phone = ?`,
          [formattedPhone]
        );

        if (existingPhone.length > 0) {
          return res.status(409).json({ 
            success: false, 
            message_ar: 'رقم الهاتف مسجل بالفعل',
            message_en: 'Phone number already registered' 
          });
        }
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Generate UUID
      const { v4: uuidv4 } = require('uuid');
      const uuid = uuidv4();

      // Prepare user data
      const userData = {
        uuid,
        email,
        phone: phone ? formatPhoneNumber(phone) : null,
        password_hash: passwordHash,
        status: 'pending_verification'
      };

      // Add admin_type for admins
      if (entityType === 'admin') {
        userData.admin_type = adminType;
      }

      // Insert user
      const columns = Object.keys(userData).join(', ');
      const placeholders = Object.keys(userData).map(() => '?').join(', ');
      const values = Object.values(userData);

      const [result] = await db.query(
        `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
        values
      );

      const userId = result.insertId;

      // Create corresponding profile record and translation for regular users and doctors
      let profileId = null;
      if (entityType === 'user') {
        // Insert minimal row in user_profiles
        const [profileInsert] = await db.query(
          `INSERT INTO user_profiles (user_id, language_preference) VALUES (?, ?)` ,
          [userId, language_code || 'ar']
        );
        profileId = profileInsert.insertId;

        // Insert initial translation row with the provided full name
        await db.query(
          `INSERT INTO user_profile_translations (profile_id, language_code, full_name) VALUES (?, ?, ?)` ,
          [profileId, language_code || 'ar', full_name || null]
        );
      } else if (entityType === 'doctor') {
        // Insert minimal row in doctor_profiles with required fields
        const { 
          license_number, 
          years_of_experience = 0,
          specialty,
          sub_specialty,
          date_of_birth,
          gender,
          nationality
        } = req.body;

        // Validate required doctor fields
        if (!license_number) {
          return res.status(400).json({ 
            success: false, 
            message_ar: 'رقم الترخيص الطبي مطلوب',
            message_en: 'Medical license number is required' 
          });
        }

        // Check if license number already exists
        const [existingLicense] = await db.query(
          `SELECT id FROM doctor_profiles WHERE license_number = ?`,
          [license_number]
        );

        if (existingLicense.length > 0) {
          return res.status(409).json({ 
            success: false, 
            message_ar: 'رقم الترخيص الطبي مسجل بالفعل',
            message_en: 'Medical license number already registered' 
          });
        }

        const [profileInsert] = await db.query(
          `INSERT INTO doctor_profiles (
            doctor_id, license_number, years_of_experience, 
            date_of_birth, gender, nationality, language_preference, approval_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')` ,
          [
            userId, 
            license_number, 
            years_of_experience || 0,
            date_of_birth || null,
            gender || null,
            nationality || null,
            language_code || 'ar'
          ]
        );
        profileId = profileInsert.insertId;

        // Insert initial translation row with the provided full name and specialty
        await db.query(
          `INSERT INTO doctor_profile_translations (
            doctor_profile_id, language_code, full_name, specialty, sub_specialty
          ) VALUES (?, ?, ?, ?, ?)` ,
          [
            profileId, 
            language_code || 'ar', 
            full_name || null,
            specialty || null,
            sub_specialty || null
          ]
        );
      }

      // Generate and send email OTP
      const emailOtp = generateOtp();
      const emailOtpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      await db.query(
        `UPDATE ${tableName} SET email_otp = ?, email_otp_expiry = ?, is_email_otp = 1 WHERE id = ?`,
        [emailOtp, emailOtpExpiry, userId]
      );

      // Send email OTP
      await sendOtp(email, null, emailOtp, 'email');

      // Generate and send phone OTP if phone provided
      // if (phone) {
      //   const phoneOtp = generateOtp();
      //   const phoneOtpExpiry = new Date(Date.now() + 5 * 60 * 1000);

      //   await db.query(
      //     `UPDATE ${tableName} SET phone_otp = ?, phone_otp_expiry = ?, is_phone_otp = 1 WHERE id = ?`,
      //     [phoneOtp, phoneOtpExpiry, userId]
      //   );

      //   await sendOtp(null, phone, phoneOtp, 'phone');
      // }

      logger.info('User registered successfully', { 
        userId, 
        email, 
        entityType,
        hasPhone: !!phone 
      });

      res.status(201).json({
        success: true,
        message_en: 'Registration successful. Please verify your email' + (phone ? ' and phone' : ''),
        message_ar: 'تم التسجيل بنجاح. يرجى التحقق من بريدك الإلكتروني' + (phone ? ' و رقم الهاتف' : ''),
        userId: userId,
        profileId: profileId,
        uuid: uuid,
        requiresVerification: {
          email: true, 
          phone: !!phone
        }
      });

    } catch (error) {
      logger.error('Registration error', { error: error.message, email, entityType });
      res.status(500).json({ 
        success: false, 
        message_en: 'Registration failed',
        message_ar: 'فشل التسجيل',
      });
    }
  }

  /**
   * Verify OTP (email or phone)
   */
  static async verifyOtp(req, res) {
    const { userId, otp, type, entityType = 'user' } = req.body;

    if (!userId || !otp || !type) {
      return res.status(400).json({ 
        success: false, 
        message_en: 'User ID, OTP, and type are required',
        message_ar: 'يجب تقديم ID المستخدم، OTP، و نوع OTP',
      });
    }

    if (!['email', 'phone'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message_en: 'Invalid OTP type',
        message_ar: 'نوع OTP غير صحيح',
      });
    }

    try {
      const tableName = entityType === 'user' ? 'users' : `${entityType}s`;
      const otpField = `${type}_otp`;
      const otpExpiryField = `${type}_otp_expiry`;
      const verifiedAtField = `${type}_verified_at`;

      // Get user and check OTP
      const [userResults] = await db.query(
        `SELECT * FROM ${tableName} WHERE id = ?`,
        [userId]
      );

      if (userResults.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message_en: 'User not found',
          message_ar: 'المستخدم غير موجود',
        });
      }

      const user = userResults[0];

      // Check if OTP matches and is not expired
      if (user[otpField] !== otp) {
        return res.status(400).json({ 
          success: false, 
          message_en: 'Invalid OTP',
          message_ar: 'OTP غير صحيح', 
        });
      }

      if (new Date() > new Date(user[otpExpiryField])) {
        return res.status(400).json({ 
          success: false, 
          message_en: 'OTP has expired',
          message_ar: 'OTP انتهت الصلاحية', 
        });
      }

      // Mark as verified and clear OTP
      const updateFields = {
        [verifiedAtField]: new Date(),
        [otpField]: null,
        [otpExpiryField]: null,
        [`is_${type}_otp`]: 0
      };

      // Check if both email and phone are verified (if phone exists)
      const emailVerified = type === 'email' || user.email_verified_at;
      const phoneVerified = type === 'phone' || user.phone_verified_at || !user.phone;

      if (emailVerified && phoneVerified) {
        updateFields.status = 'active';
      }

      const updateQuery = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
      const updateValues = Object.values(updateFields);

      await db.query(
        `UPDATE ${tableName} SET ${updateQuery} WHERE id = ?`,
        [...updateValues, userId]
      );

      logger.info('OTP verified successfully', { 
        userId, 
        type, 
        entityType,
        accountActivated: updateFields.status === 'active'
      });

      res.json({
        success: true,
        message_en: `${type.charAt(0).toUpperCase() + type.slice(1)} verified successfully`,
        message_ar: `${type.charAt(0).toUpperCase() + type.slice(1)} تم التحقق منه بنجاح`,
        userId: userId,
        profileId: user.profile_id,
        uuid: user.uuid,
        accountActivated: updateFields.status === 'active'
      });

    } catch (error) {
      logger.error('OTP verification error', { error: error.message, userId, type });
      res.status(500).json({ 
        success: false, 
        message_en: 'OTP verification failed',
        message_ar: 'فشل التحقق من OTP', 
      });
    }
  }

  /**
   * Resend OTP
   */
  static async resendOtp(req, res) {
    const { userId, type, entityType = 'user' } = req.body;

    if (!userId || !type) {
      return res.status(400).json({ 
        success: false, 
        message_en: 'User ID and type are required',
        message_ar: 'يجب تقديم ID المستخدم و نوع OTP',
      });
    }

    if (!['email', 'phone'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message_en: 'Invalid OTP type',
        message_ar: 'نوع OTP غير صحيح',
      });
    }

    try {
      const tableName = entityType === 'user' ? 'users' : `${entityType}s`;

      // Get user
      const [userResults] = await db.query(
        `SELECT * FROM ${tableName} WHERE id = ?`,
        [userId]
      );

      if (userResults.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message_en: 'User not found',
          message_ar: 'المستخدم غير موجود', 
        });
      }

      const user = userResults[0];

      // Check if already verified
      const verifiedAtField = `${type}_verified_at`;
      if (user[verifiedAtField]) {
        return res.status(400).json({ 
          success: false, 
          message_en: `${type.charAt(0).toUpperCase() + type.slice(1)} already verified`,
          message_ar: `${type.charAt(0).toUpperCase() + type.slice(1)} تم التحقق منه بالفعل`, 
        });
      }

      // Generate new OTP
      const newOtp = generateOtp();
      const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

      const otpField = `${type}_otp`;
      const otpExpiryField = `${type}_otp_expiry`;
      const isOtpField = `is_${type}_otp`;

      await db.query(
        `UPDATE ${tableName} SET ${otpField} = ?, ${otpExpiryField} = ?, ${isOtpField} = 1 WHERE id = ?`,
        [newOtp, otpExpiry, userId]
      );

      // Send OTP
      if (type === 'email') {
        await sendOtp(user.email, null, newOtp, 'email');
      } else {
        await sendOtp(null, user.phone, newOtp, 'phone');
      }

      logger.info('OTP resent successfully', { userId, type, entityType });

      res.json({
        success: true,
        message_en: `New ${type} OTP sent successfully`,
        message_ar: `تم إرسال OTP جديد بنجاح`,
      });

    } catch (error) {
      logger.error('Resend OTP error', { error: error.message, userId, type });
      res.status(500).json({ 
        success: false, 
        message_en: 'Failed to resend OTP',
        message_ar: 'فشل إعادة إرسال OTP', 
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req, res) {
    try {
      const result = await SecurityService.refreshAccessToken(req.body.refreshToken, req);

      if (!result.success) {
        return res.status(403).json(result);
      }

      res.json({
        success: true,
        accessToken: result.accessToken
      });

    } catch (error) {
      logger.error('Token refresh error', { error: error.message });
      res.status(500).json({ 
        success: false, 
        message_en: 'Token refresh failed',
        message_ar: 'فشل تحديث رمز التحقق', 
      });
    }
  }

  /**
   * Logout
   */
  static async logout(req, res) {
    const { sessionToken } = req.body;

    try {
      const result = await SecurityService.logout(
        req.user.id,
        req.user.entityType,
        sessionToken,
        req
      );

      // If the service indicates failure, propagate appropriate status code
      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);

    } catch (error) {
      logger.error('Logout error', { error: error.message });
      res.status(500).json({ 
        success: false, 
        message_en: 'Logout failed',
        message_ar: 'فشل تسجيل الخروج', 
      });
    }
  }

  /**
   * Get user's active sessions
   */
  static async getActiveSessions(req, res) {
    try {
      const result = await SecurityService.getActiveSessions(req.user.id, req.user.entityType);

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json({
        success: true,
        sessions: result.sessions
      });

    } catch (error) {
      logger.error('Get sessions error', { error: error.message });
      res.status(500).json({ 
        success: false, 
        message_en: 'Failed to retrieve sessions',
        message_ar: 'فشل استرجاع الجلسات', 
      });
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(req, res) {
    const { email, entityType = 'user' } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message_en: 'Email is required',
        message_ar: 'البريد الإلكتروني مطلوب', 
      });
    }

    try {
      // Step 1: send OTP to the user's email
      const result = await SecurityService.generatePasswordResetOtp(email, 'email', entityType, req);
      res.json(result);

    } catch (error) {
      logger.error('Password reset request error', { error: error.message });
      res.status(500).json({ 
        success: false, 
        message_en: 'Password reset request failed',
        message_ar: 'فشل طلب إعادة تعيين كلمة المرور', 
      });
    }
  }

  /**
   * Verify Password Reset OTP and return reset token
   */
  static async verifyPasswordResetOtp(req, res) {
    const { email, otp, entityType = 'user' } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message_en: 'Email and OTP are required',
        message_ar: 'البريد الإلكتروني و OTP مطلوبان', 
      });
    }

    try {
      const result = await SecurityService.verifyPasswordResetOtp(email, otp, 'email', entityType, req);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Verify password reset OTP error', { error: error.message });
      res.status(500).json({ 
        success: false, 
        message_en: 'Failed to verify OTP',
        message_ar: 'فشل التحقق من OTP', 
      });
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(req, res) {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message_en: 'Token and new password are required',
        message_ar: 'رمز التحقق و كلمة المرور الجديدة مطلوبان', 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message_en: 'Password must be at least 8 characters long',
        message_ar: 'كلمة المرور يجب أن تكون على الأقل 8 أحرف', 
      });
    }

    try {
      const result = await SecurityService.resetPassword(token, newPassword, req);
      res.json(result);

    } catch (error) {
      logger.error('Password reset error', { error: error.message });
      res.status(500).json({ 
        success: false, 
        message_en: 'Password reset failed',
        message_ar: 'فشل إعادة تعيين كلمة المرور', 
      });
    }
  }

  /**
   * Get security logs (user can see their own)
   */
  static async getSecurityLogs(req, res) {
    const { limit = 50 } = req.query;

    try {
      const result = await SecurityService.getSecurityLogs(
        req.user.id, 
        req.user.entityType, 
        parseInt(limit)
      );

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json({
        success: true,
        logs: result.logs
      });

    } catch (error) {
      logger.error('Get security logs error', { error: error.message });
      res.status(500).json({ 
        success: false, 
        message_en: 'Failed to retrieve security logs',
        message_ar: 'فشل استرجاع سجلات الأمان', 
      });
    }
  }

  /**
   * Request Password Reset OTP (email or phone)
   */
  static async requestPasswordResetOtp(req, res) {
    const { email, phone, type, entityType = 'user' } = req.body;

    // Determine channel
    let channel = type;
    if (!channel) channel = email ? 'email' : 'phone';
    const identifier = channel === 'email' ? email : phone;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message_en: 'Email or phone is required',
        message_ar: 'البريد الإلكتروني أو الهاتف مطلوب'
      });
    }

    if (channel === 'phone' && !isValidPhoneNumber(identifier)) {
      return res.status(400).json({
        success: false,
        message_en: 'Invalid phone number',
        message_ar: 'رقم الهاتف غير صحيح'
      });
    }

    try {
      const result = await SecurityService.generatePasswordResetOtp(identifier, channel, entityType, req);
      res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      logger.error('Request OTP error', { error: error.message, entityType, channel });
      res.status(500).json({ 
        success: false, 
        message_en: 'Failed to process request',
        message_ar: 'فشل معالجة الطلب', 
      });
    }
  }

  /**
   * Reset password using OTP
   */
  static async resetPasswordOtp(req, res) {
    const { email, phone, otp, newPassword, type, entityType = 'user' } = req.body;

    if (!otp || !newPassword) {
      return res.status(400).json({ success: false, message_en: 'OTP and new password are required', message_ar: 'OTP و كلمة المرور الجديدة مطلوبة' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message_en: 'Password must be at least 8 characters', message_ar: 'كلمة المرور يجب أن تكون على الأقل 8 أحرف' });
    }

    let channel = type;
    if (!channel) channel = email ? 'email' : 'phone';
    const identifier = channel === 'email' ? email : phone;
    if (!identifier) {
      return res.status(400).json({ success: false, message_en: 'Email or phone is required', message_ar: 'البريد الإلكتروني أو الهاتف مطلوب' });
    }
    if (channel === 'phone' && !isValidPhoneNumber(identifier)) {
      return res.status(400).json({ success: false, message_en: 'Invalid phone number format', message_ar: 'رقم الهاتف غير صحيح' });
    }

    try {
      const result = await SecurityService.resetPasswordWithOtp(identifier, otp, newPassword, channel, entityType, req);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Reset password with OTP error', { error: error.message, entityType });
      res.status(500).json({ 
        success: false, 
        message_en: 'Failed to reset password',
        message_ar: 'فشل إعادة تعيين كلمة المرور', 
      });
    }
  }

  /**
   * Change password from within the app (authenticated user)
   * Requires authentication token and old password verification
   */
  static async changePasswordInApp(req, res) {
    const { oldPassword, newPassword } = req.body;

    // Validate input
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message_en: 'Current password and new password are required',
        message_ar: 'كلمة المرور الحالية وكلمة المرور الجديدة مطلوبة' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message_en: 'New password must be at least 8 characters long',
        message_ar: 'كلمة المرور الجديدة يجب أن تكون على الأقل 8 أحرف' 
      });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({ 
        success: false, 
        message_en: 'New password must be different from current password',
        message_ar: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية' 
      });
    }

    try {
      // req.user is populated by authenticateJWT middleware
      const result = await SecurityService.changePasswordInApp(
        req.user.id,
        req.user.entityType,
        oldPassword,
        newPassword,
        req
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      logger.info('Password changed successfully in app', { 
        userId: req.user.id, 
        entityType: req.user.entityType 
      });

      res.json(result);

    } catch (error) {
      logger.error('Change password in app error', { 
        error: error.message, 
        userId: req.user.id, 
        entityType: req.user.entityType 
      });
      res.status(500).json({ 
        success: false, 
        message_en: 'Failed to change password',
        message_ar: 'فشل تغيير كلمة المرور' 
      });
    }
  }
}

module.exports = AuthController;