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
    new winston.transports.File({ filename: 'chat-users.log' })
  ]
});

/**
 * Chat Users Controller
 * التحكم في جلب المستخدمين للشات
 */
class ChatUsersController {
  
  /**
   * Get all users for chat
   * جلب جميع المستخدمين للشات (باستثناء المستخدم الحالي)
   */
  static async getChatUsers(req, res) {
    try {
      const currentUserId = req.user.id;
      const currentUserType = req.user.entityType;
      const { type, search } = req.query;

      logger.info('Fetching chat users', {
        currentUserId,
        currentUserType,
        filterType: type,
        search
      });

      let allUsers = [];

      // جلب المستخدمين (Users)
      if (!type || type === 'user') {
        const [users] = await db.query(`
          SELECT 
            u.id,
            u.uuid,
            u.email,
            u.status,
            'user' as entity_type,
            upt.full_name,
            up.profile_picture_url
          FROM users u
          LEFT JOIN user_profiles up ON u.id = up.user_id
          LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = 'ar'
          WHERE u.status = 'active'
          ${search ? "AND (upt.full_name LIKE ? OR u.email LIKE ?)" : ""}
          ${currentUserType === 'user' ? "AND u.id != ?" : ""}
          ORDER BY upt.full_name ASC
          LIMIT 50
        `, search ? 
          (currentUserType === 'user' ? [`%${search}%`, `%${search}%`, currentUserId] : [`%${search}%`, `%${search}%`]) :
          (currentUserType === 'user' ? [currentUserId] : [])
        );
        allUsers = allUsers.concat(users);
      }

      // جلب الأطباء (Doctors)
      if (!type || type === 'doctor') {
        const [doctors] = await db.query(`
          SELECT 
            d.id,
            d.uuid,
            d.email,
            d.status,
            'doctor' as entity_type,
            dpt.full_name,
            dp.profile_picture_url,
            dpt.specialty
          FROM doctors d
          LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
          LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = 'ar'
          WHERE d.status = 'active'
          ${search ? "AND (dpt.full_name LIKE ? OR d.email LIKE ?)" : ""}
          ${currentUserType === 'doctor' ? "AND d.id != ?" : ""}
          ORDER BY dpt.full_name ASC
          LIMIT 50
        `, search ? 
          (currentUserType === 'doctor' ? [`%${search}%`, `%${search}%`, currentUserId] : [`%${search}%`, `%${search}%`]) :
          (currentUserType === 'doctor' ? [currentUserId] : [])
        );
        allUsers = allUsers.concat(doctors);
      }

      // جلب المدراء (Admins)
      if (!type || type === 'admin') {
        const [admins] = await db.query(`
          SELECT 
            a.id,
            a.uuid,
            a.email,
            a.status,
            'admin' as entity_type,
            a.email as full_name,
            NULL as profile_picture_url,
            a.admin_type
          FROM admins a
          WHERE a.status = 'active'
          ${search ? "AND a.email LIKE ?" : ""}
          ${currentUserType === 'admin' ? "AND a.id != ?" : ""}
          ORDER BY a.email ASC
          LIMIT 50
        `, search ? 
          (currentUserType === 'admin' ? [`%${search}%`, currentUserId] : [`%${search}%`]) :
          (currentUserType === 'admin' ? [currentUserId] : [])
        );
        allUsers = allUsers.concat(admins);
      }

      // جلب المساعدين (Assistants)
      if (!type || type === 'assistant') {
        const [assistants] = await db.query(`
          SELECT 
            a.id,
            a.uuid,
            a.email,
            a.status,
            'assistant' as entity_type,
            a.email as full_name,
            NULL as profile_picture_url
          FROM assistants a
          WHERE a.status = 'active'
          ${search ? "AND a.email LIKE ?" : ""}
          ${currentUserType === 'assistant' ? "AND a.id != ?" : ""}
          ORDER BY a.email ASC
          LIMIT 50
        `, search ? 
          (currentUserType === 'assistant' ? [`%${search}%`, currentUserId] : [`%${search}%`]) :
          (currentUserType === 'assistant' ? [currentUserId] : [])
        );
        allUsers = allUsers.concat(assistants);
      }

      // تنسيق البيانات
      const formattedUsers = allUsers.map(user => ({
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        name: user.full_name || user.email,
        type: user.entity_type,
        status: user.status,
        profile_picture_url: user.profile_picture_url,
        specialty: user.specialty || null,
        admin_type: user.admin_type || null
      }));

      logger.info('Chat users fetched successfully', {
        count: formattedUsers.length,
        currentUserId
      });

      res.status(200).json({
        success: true,
        users: formattedUsers,
        count: formattedUsers.length
      });

    } catch (error) {
      logger.error('Error fetching chat users', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message_ar: 'حدث خطأ في جلب المستخدمين',
        message_en: 'Error fetching users',
        error: error.message
      });
    }
  }
}

module.exports = ChatUsersController;
