const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();

const formatPhoneNumber = (phone) => {
  return phone.replace(/^\+/, '').replace(/\s+/g, '').replace(/-/g, '');
};

const transporter = nodemailer.createTransport({
//   host: "mail.bashraai.com",
  host: "smtp.hostinger.com",
  port: 465,
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to generate OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 🎨 قالب HTML بتصميم Ultra-Modern
const generateOtpEmailHtml = (otp) => {
    // 🔗 روابط الصور والمواقع
    const SECURITY_IMAGE_URL = "https://front-bashra-ai.vercel.app/Mail.webp";
    const COMPANY_NAME = "Bashra AI"; 
    
    // 🔗 روابط وسائل التواصل الاجتماعي
    const SOCIAL_LINKS = {
        website: process.env.WEBSITE_URL || "https://bashraai.com",
        facebook: process.env.FACEBOOK_URL || "https://www.facebook.com/people/Bashra-Bashra/pfbid0hJRW1aLVZB8deRBYUt3gmhXeMmwgksqxF6PAFAus6nRau5NJikuqMWxEM22fT1KWl/",
        instagram: process.env.INSTAGRAM_URL || "https://www.instagram.com/bashraai",
    };

    return `
<!DOCTYPE html>
<html lang="ar" dir="rtl" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>رمز التحقق الخاص بك - ${COMPANY_NAME}</title>
    </head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f5f7; width: 100%; margin: 0 auto;">
        <tr>
            <td align="center" style="padding: 40px 15px;">
                
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden;">
                    
                    <tr>
                        <td align="center" style="padding: 40px 40px 20px 40px;">
                            <h2 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px; color: #111827;">
                                Bashra <span style="color: #2563eb;">AI</span>
                            </h2>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 10px 40px 40px 40px;">
                            
                            <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #111827; text-align: center;">
                                التحقق من حسابك
                            </h1>
                            
                                <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
                                   : للتحقق من هويتك وإكمال عملية تسجيل الدخول ، يرجى استخدام الرمز أدناه 
                                </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 32px;">
                                <tr>
                                    <td align="center">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; width: 100%; max-width: 300px;">
                                            <tr>
                                                <td align="center" style="padding: 24px;">
                                                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 700; color: #111827; letter-spacing: 16px; display: block; margin-right: -16px;">
                                                        ${otp}
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 32px;">
                                <tr>
                                    <td align="center">
                                        <img src="${SECURITY_IMAGE_URL}" alt="أمان الحساب" width="500" style="display: block; width: 100%; max-width: 500px; height: auto; border-radius: 8px; border: 1px solid #f3f4f6;">
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fffbeb; border-right: 4px solid #f59e0b; border-radius: 4px;">
                                <tr>
                                    <td style="padding: 16px 20px;">
                                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #92400e; text-align: right;">
                                            <strong>ملاحظة:</strong> هذا الرمز صالح لمدة 15 دقيقة فقط. إذا لم تطلب هذا الرمز، يمكنك تجاهل هذا البريد الإلكتروني بأمان.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 30px 40px; background-color: #fafafa; border-top: 1px solid #eaeaea;">
                            
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                                <tr>
                                    <td align="center">
                                        <a href="${SOCIAL_LINKS.website}" target="_blank" style="text-decoration: none; display: inline-block; margin: 0 10px;">
                                            <img src="https://img.icons8.com/material-rounded/48/9ca3af/domain.png" alt="Website" width="24" height="24" style="display: block;">
                                        </a>
                                        <a href="${SOCIAL_LINKS.facebook}" target="_blank" style="text-decoration: none; display: inline-block; margin: 0 10px;">
                                            <img src="https://img.icons8.com/material-rounded/48/9ca3af/facebook-new.png" alt="Facebook" width="24" height="24" style="display: block;">
                                        </a>
                                        <a href="${SOCIAL_LINKS.instagram}" target="_blank" style="text-decoration: none; display: inline-block; margin: 0 10px;">
                                            <img src="https://img.icons8.com/material-rounded/48/9ca3af/instagram-new.png" alt="Instagram" width="24" height="24" style="display: block;">
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; text-align: center;">
                                © ${new Date().getFullYear()} ${COMPANY_NAME}. جميع الحقوق محفوظة.
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                                رسالة تلقائية لحماية حسابك، يرجى عدم الرد.
                            </p>
                        </td>
                    </tr>

                </table>
                
                <div style="height: 40px; line-height: 40px; font-size: 40px;">&nbsp;</div>

            </td>
        </tr>
    </table>

</body>
</html>
    `;
};

// Function to send OTP
const sendOtp = async (email, phone, otp, type) => {
  if (type === "email") {
    const htmlContent = generateOtpEmailHtml(otp);

    const mailOptions = {
      from: `"${process.env.EMAIL_SENDER_NAME || 'Bashra AI'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 رمز التحقق الخاص بك - OTP',
      html: htmlContent, 
      text: `رمز التحقق الخاص بك هو: ${otp}\n\nهذا الرمز صالح لمدة 15 دقيقة فقط.\nيرجى عدم مشاركة هذا الرمز مع أي شخص.\n\nإذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.`, 
    };

    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email OTP:', error);
          reject(error);
        } else {
          console.log('Email OTP sent successfully:', info.response);
          resolve(info);
        }
      });
    });

  } else if (type === "phone") {
    try {
      const formattedPhone = formatPhoneNumber(phone);
      const response = await axios({
        method: 'POST',
        url: 'https://mywhinlite.p.rapidapi.com/sendmsg',
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
          'x-rapidapi-host': 'mywhinlite.p.rapidapi.com',
          'Content-Type': 'application/json'
        },
        data: {
          phone_number_or_group_id: formattedPhone,
          is_group: false,
          message: `رمز التحقق الخاص بك: ${otp}\nصالح لمدة 15 دقيقة فقط.\n\n${process.env.COMPANY_NAME || 'Bashra AI'}`,
        }
      });

      console.log('SMS OTP sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending SMS OTP:', error.response?.data || error.message);
      throw error;
    }
  } else {
    throw new Error("Invalid type provided. Use 'email' or 'phone'.");
  }
};

module.exports = { sendOtp, generateOtp };
















































// const nodemailer = require('nodemailer');
// const axios = require('axios');
// require('dotenv').config();

// const formatPhoneNumber = (phone) => {
//   return phone.replace(/^\+/, '').replace(/\s+/g, '').replace(/-/g, '');
// };

// //   port: 587,
// //   secure: false, 

// const transporter = nodemailer.createTransport({
// //   host: "mail.bashraai.com",
//   host: "smtp.hostinger.com",
//   port: 465,
//   secure: true, 
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // Function to generate OTP
// const generateOtp = () => {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// };

// // 🎨 قالب HTML احترافي محسّن للـ OTP Email
// const generateOtpEmailHtml = (otp) => {
//     // 🎨 ألوان العلامة التجارية - يمكنك تعديلها بسهولة
//     const BRAND_COLORS = {
//         primary: '#1a73e8',      // اللون الأساسي (أزرق)
//         secondary: '#34a853', 
//         primary2: '#dacfd6',      // اللون الأساسي (أزرق)
//         secondary2: '#ffffff',    // اللون الثانوي (أخضر)   // اللون الثانوي (أخضر)
//         accent: '#fbbc04',       // لون التمييز (أصفر ذهبي)
//         background: '#f8f9fa',   // خلفية الصفحة
//         cardBg: '#ffffff',       // خلفية البطاقة
//         textPrimary: '#202124',  // نص أساسي
//         textSecondary: '#5f6368',// نص ثانوي
//         border: '#dadce0',       // حدود
//         otpBg: '#e8f0fe',        // خلفية OTP
//         otpBorder: '#aecbfa',    // حدود OTP
//     };

//     // 🔗 روابط الصور والمواقع
//     const LOGO_URL = "https://front-bashra-ai.vercel.app/og-image.webp";
//     const SECURITY_IMAGE_URL = "https://front-bashra-ai.vercel.app/Mail.webp";
//     const COMPANY_NAME = "Bashra AI"; // اسم الشركة
    
//     // 🔗 روابط وسائل التواصل الاجتماعي (قم بتعديلها حسب روابطك الفعلية)
//     const SOCIAL_LINKS = {
//         website: process.env.WEBSITE_URL || "https://bashraai.com",
//         facebook: process.env.FACEBOOK_URL || "https://www.facebook.com/people/Bashra-Bashra/pfbid0hJRW1aLVZB8deRBYUt3gmhXeMmwgksqxF6PAFAus6nRau5NJikuqMWxEM22fT1KWl/",
//         instagram: process.env.INSTAGRAM_URL || "https://www.instagram.com/bashraai",
//     };

//     return `
// <!DOCTYPE html>
// <html lang="ar" dir="rtl" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <meta http-equiv="X-UA-Compatible" content="IE=edge">
//     <meta name="x-apple-disable-message-reformatting">
//     <title>رمز التحقق الخاص بك - ${COMPANY_NAME}</title>
//     <!--[if mso]>
//     <style type="text/css">
//         body, table, td {font-family: Arial, sans-serif !important;}
//     </style>
//     <![endif]-->
// </head>
// <body style="margin: 0; padding: 0; background-color: ${BRAND_COLORS.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans Arabic', sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    
//     <!-- Wrapper Table -->
//     <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BRAND_COLORS.background};">
//         <tr>
//             <td align="center" style="padding: 40px 20px;">
                
//                 <!-- Main Container -->
//                 <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: ${BRAND_COLORS.cardBg}; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05); overflow: hidden;">
                    
//                 <!-- Header with Logo -->
//                 <tr>
//                     <td align="center" style="background: linear-gradient(135deg, rgba(218, 207, 214, 0.7) 0%, rgba(255, 255, 255, 0.5) 50%, rgba(218, 207, 214, 0.6) 100%); padding: 30px 20px; border: 1px solid rgba(255, 255, 255, 0.4); box-shadow: 0 8px 32px 0 rgba(218, 207, 214, 0.37);">
//                         <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
//                             <tr>
//                                 <td align="center">
//                                     <img src="${LOGO_URL}" alt="${COMPANY_NAME}" width="160" style="display: block; width: 160px; max-width: 100%; height: auto; border: 0;">
//                                 </td>
//                             </tr>
//                         </table>
//                     </td>
//                 </tr>

//                     <!-- Content Section -->
//                     <tr>
//                         <td style="padding: 50px 40px 40px 40px;">
                            
//                             <!-- Greeting -->
//                             <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
//                                 <tr>
//                                     <td style="padding-bottom: 24px;">
//                                         <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: ${BRAND_COLORS.textPrimary}; line-height: 1.3; text-align: center;">
//                                             مرحباً بك! 👋
//                                         </h1>
//                                     </td>
//                                 </tr>
                                
//                                 <!-- Introduction Text -->
//                                 <tr>
//                                     <td style="padding-bottom: 32px;">
//                                         <p style="margin: 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textSecondary}; text-align: center;">
//                                             لإكمال عملية التحقق من حسابك، يرجى استخدام<br>
//                                             رمز التحقق لمرة واحدة (OTP) التالي:
//                                         </p>
//                                     </td>
//                                 </tr>

//                                 <!-- OTP Box -->
//                                 <tr>
//                                     <td align="center" style="padding: 0 0 32px 0;">
//                                         <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BRAND_COLORS.otpBg}; border: 3px solid ${BRAND_COLORS.otpBorder}; border-radius: 12px; box-shadow: 0 2px 8px rgba(26, 115, 232, 0.15);">
//                                             <tr>
//                                                 <td style="padding: 28px 48px;">
//                                                     <p style="margin: 0; font-size: 42px; font-weight: 700; color: ${BRAND_COLORS.primary}; letter-spacing: 12px; text-align: center; font-family: 'Courier New', Courier, monospace;">
//                                                         ${otp}
//                                                     </p>
//                                                 </td>
//                                             </tr>
//                                         </table>
//                                     </td>
//                                 </tr>

//                                 <!-- Security Notice -->
//                                 <tr>
//                                     <td style="padding: 24px 0; border-top: 2px solid ${BRAND_COLORS.border}; border-bottom: 2px solid ${BRAND_COLORS.border};">
//                                         <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
//                                             <tr>
//                                                 <td style="padding: 0 0 12px 0;">
//                                                     <p style="margin: 0; font-size: 15px; font-weight: 600; color: ${BRAND_COLORS.textPrimary}; text-align: center;">
//                                                         ⚠️ تنبيه أمني هام
//                                                     </p>
//                                                 </td>
//                                             </tr>
//                                             <tr>
//                                                 <td>
//                                                     <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${BRAND_COLORS.textSecondary}; text-align: center;">
//                                                         • هذا الرمز صالح لمدة <strong style="color: ${BRAND_COLORS.primary};">15 دقيقة فقط</strong><br>
//                                                         • لا تشارك هذا الرمز مع أي شخص<br>
//                                                         • لن نطلب منك هذا الرمز عبر الهاتف أو البريد
//                                                     </p>
//                                                 </td>
//                                             </tr>
//                                         </table>
//                                     </td>
//                                 </tr>

//                                 <!-- Security Image -->
//                                 <tr>
//                                     <td align="center" style="padding: 32px 0 24px 0;">
//                                         <img src="${SECURITY_IMAGE_URL}" alt="الأمان والحماية" width="100%" style="display: block; max-width: 100%; height: auto; border-radius: 12px; border: 0;">
//                                     </td>
//                                 </tr>

//                                 <!-- Help Text -->
//                                 <tr>
//                                     <td style="padding: 0 0 24px 0;">
//                                         <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${BRAND_COLORS.textSecondary}; text-align: center;">
//                                             إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.<br>
//                                             حسابك آمن ولا داعي لاتخاذ أي إجراء.
//                                         </p>
//                                     </td>
//                                 </tr>

//                                 <!-- Thank You -->
//                                 <tr>
//                                     <td style="padding-top: 12px;">
//                                         <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${BRAND_COLORS.primary}; text-align: center;">
//                                             شكراً لاستخدامك ${COMPANY_NAME} 💙
//                                         </p>
//                                     </td>
//                                 </tr>
//                             </table>

//                         </td>
//                     </tr>

//                     <!-- Footer -->
//                     <tr>
//                         <td style="background-color: ${BRAND_COLORS.background}; padding: 32px 40px; border-top: 1px solid ${BRAND_COLORS.border};">
//                             <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                
//                                 <!-- Social Media Icons -->
//                                 <tr>
//                                     <td align="center" style="padding-bottom: 20px;">
//                                         <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display: inline-block;">
//                                             <tr>
//                                                 <!-- Website Icon -->
//                                                 <td style="padding: 0 10px;">
//                                                     <a href="${SOCIAL_LINKS.website}" target="_blank" style="text-decoration: none;">
//                                                         <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BRAND_COLORS.primary}; border-radius: 50%; width: 40px; height: 40px;">
//                                                             <tr>
//                                                                 <td align="center" valign="middle" style="padding: 0;">
//                                                                     <img src="https://img.icons8.com/ios-filled/50/ffffff/domain.png" alt="الموقع" width="20" height="20" style="display: block; border: 0;">
//                                                                 </td>
//                                                             </tr>
//                                                         </table>
//                                                     </a>
//                                                 </td>
                                                
//                                                 <!-- Facebook Icon -->
//                                                 <td style="padding: 0 10px;">
//                                                     <a href="${SOCIAL_LINKS.facebook}" target="_blank" style="text-decoration: none;">
//                                                         <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: #1877f2; border-radius: 50%; width: 40px; height: 40px;">
//                                                             <tr>
//                                                                 <td align="center" valign="middle" style="padding: 0;">
//                                                                     <img src="https://img.icons8.com/ios-filled/50/ffffff/facebook-new.png" alt="فيسبوك" width="20" height="20" style="display: block; border: 0;">
//                                                                 </td>
//                                                             </tr>
//                                                         </table>
//                                                     </a>
//                                                 </td>
                                                
//                                                 <!-- Instagram Icon -->
//                                                 <td style="padding: 0 10px;">
//                                                     <a href="${SOCIAL_LINKS.instagram}" target="_blank" style="text-decoration: none;">
//                                                         <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); border-radius: 50%; width: 40px; height: 40px;">
//                                                             <tr>
//                                                                 <td align="center" valign="middle" style="padding: 0;">
//                                                                     <img src="https://img.icons8.com/ios-filled/50/ffffff/instagram-new.png" alt="انستجرام" width="20" height="20" style="display: block; border: 0;">
//                                                                 </td>
//                                                             </tr>
//                                                         </table>
//                                                     </a>
//                                                 </td>
//                                             </tr>
//                                         </table>
//                                     </td>
//                                 </tr>
                                
//                                 <!-- Company Name and Copyright -->
//                                 <tr>
//                                     <td align="center" style="padding-bottom: 12px;">
//                                         <p style="margin: 0; font-size: 13px; color: ${BRAND_COLORS.textSecondary}; line-height: 1.5;">
//                                             © ${new Date().getFullYear()} <strong>${COMPANY_NAME}</strong>. جميع الحقوق محفوظة.
//                                         </p>
//                                     </td>
//                                 </tr>
                                
//                                 <!-- Auto Message Notice -->
//                                 <tr>
//                                     <td align="center">
//                                         <p style="margin: 0; font-size: 12px; color: ${BRAND_COLORS.textSecondary}; line-height: 1.5;">
//                                             هذه رسالة آلية، يرجى عدم الرد عليها مباشرة.
//                                         </p>
//                                     </td>
//                                 </tr>
//                             </table>
//                         </td>
//                     </tr>

//                 </table>
//                 <!-- End Main Container -->

//                 <!-- Spacer for email clients -->
//                 <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px;">
//                     <tr>
//                         <td style="padding: 20px 0;">
//                             <p style="margin: 0; font-size: 11px; color: #999; text-align: center; line-height: 1.5;">
//                                 لأفضل تجربة، يرجى عرض هذا البريد في برنامج بريد إلكتروني حديث.
//                             </p>
//                         </td>
//                     </tr>
//                 </table>

//             </td>
//         </tr>
//     </table>
//     <!-- End Wrapper -->

// </body>
// </html>
//     `;
// };

// // Function to send OTP
// const sendOtp = async (email, phone, otp, type) => {
//   if (type === "email") {
//     const htmlContent = generateOtpEmailHtml(otp);

//     const mailOptions = {
//       from: `"${process.env.EMAIL_SENDER_NAME || 'Bashra AI'}" <${process.env.EMAIL_USER}>`,
//       to: email,
//       subject: '🔐 رمز التحقق الخاص بك - OTP',
//       html: htmlContent, 
//       text: `رمز التحقق الخاص بك هو: ${otp}\n\nهذا الرمز صالح لمدة 15 دقيقة فقط.\nيرجى عدم مشاركة هذا الرمز مع أي شخص.\n\nإذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.`, 
//     };

//     return new Promise((resolve, reject) => {
//       transporter.sendMail(mailOptions, (error, info) => {
//         if (error) {
//           console.error('Error sending email OTP:', error);
//           reject(error);
//         } else {
//           console.log('Email OTP sent successfully:', info.response);
//           resolve(info);
//         }
//       });
//     });

//   } else if (type === "phone") {
//     try {
//       const formattedPhone = formatPhoneNumber(phone);
//       const response = await axios({
//         method: 'POST',
//         url: 'https://mywhinlite.p.rapidapi.com/sendmsg',
//         headers: {
//           'x-rapidapi-key': process.env.RAPIDAPI_KEY,
//           'x-rapidapi-host': 'mywhinlite.p.rapidapi.com',
//           'Content-Type': 'application/json'
//         },
//         data: {
//           phone_number_or_group_id: formattedPhone,
//           is_group: false,
//           message: `رمز التحقق الخاص بك: ${otp}\nصالح لمدة 15 دقيقة فقط.\n\n${process.env.COMPANY_NAME || 'Bashra AI'}`,
//         }
//       });

//       console.log('SMS OTP sent successfully:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('Error sending SMS OTP:', error.response?.data || error.message);
//       throw error;
//     }
//   } else {
//     throw new Error("Invalid type provided. Use 'email' or 'phone'.");
//   }
// };

// module.exports = { sendOtp, generateOtp };































// const nodemailer = require('nodemailer');
// const axios = require('axios');
// require('dotenv').config();

// const formatPhoneNumber = (phone) => {
//   return phone.replace(/^\+/, '').replace(/\s+/g, '').replace(/-/g, '');
// };

// const transporter = nodemailer.createTransport({
//   host: "mail.bashraai.com",
//   port: 465,
//   secure: true, 
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // Function to generate OTP
// const generateOtp = () => {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// };

// // 🎨 قالب HTML احترافي محسّن للـ OTP Email
// const generateOtpEmailHtml = (otp) => {
//     // 🎨 ألوان العلامة التجارية - يمكنك تعديلها بسهولة
//     const BRAND_COLORS = {
//         primary: '#1a73e8',      // اللون الأساسي (أزرق)
//         secondary: '#34a853',    // اللون الثانوي (أخضر)
//         accent: '#fbbc04',       // لون التمييز (أصفر ذهبي)
//         background: '#f8f9fa',   // خلفية الصفحة
//         cardBg: '#ffffff',       // خلفية البطاقة
//         textPrimary: '#202124',  // نص أساسي
//         textSecondary: '#5f6368',// نص ثانوي
//         border: '#dadce0',       // حدود
//         otpBg: '#e8f0fe',        // خلفية OTP
//         otpBorder: '#aecbfa',    // حدود OTP
//     };

//     // 🔗 روابط الصور
//     const LOGO_URL = "https://front-bashrax.vercel.app/assets/images/x4.png";
//     const SECURITY_IMAGE_URL = "https://front-bashra-ai.vercel.app/16.webp";
//     const COMPANY_NAME = "Bashra AI"; // اسم الشركة

//     return `
// <!DOCTYPE html>
// <html lang="ar" dir="rtl" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <meta http-equiv="X-UA-Compatible" content="IE=edge">
//     <meta name="x-apple-disable-message-reformatting">
//     <title>رمز التحقق الخاص بك - ${COMPANY_NAME}</title>
//     <!--[if mso]>
//     <style type="text/css">
//         body, table, td {font-family: Arial, sans-serif !important;}
//     </style>
//     <![endif]-->
// </head>
// <body style="margin: 0; padding: 0; background-color: ${BRAND_COLORS.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans Arabic', sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    
//     <!-- Wrapper Table -->
//     <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BRAND_COLORS.background};">
//         <tr>
//             <td align="center" style="padding: 40px 20px;">
                
//                 <!-- Main Container -->
//                 <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: ${BRAND_COLORS.cardBg}; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05); overflow: hidden;">
                    
//                     <!-- Header with Logo -->
//                     <tr>
//                         <td align="center" style="background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%); padding: 30px 20px;">
//                             <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
//                                 <tr>
//                                     <td align="center">
//                                         <img src="${LOGO_URL}" alt="${COMPANY_NAME}" width="160" style="display: block; width: 160px; max-width: 100%; height: auto; border: 0;">
//                                     </td>
//                                 </tr>
//                             </table>
//                         </td>
//                     </tr>

//                     <!-- Content Section -->
//                     <tr>
//                         <td style="padding: 50px 40px 40px 40px;">
                            
//                             <!-- Greeting -->
//                             <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
//                                 <tr>
//                                     <td style="padding-bottom: 24px;">
//                                         <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: ${BRAND_COLORS.textPrimary}; line-height: 1.3; text-align: center;">
//                                             مرحباً بك! 👋
//                                         </h1>
//                                     </td>
//                                 </tr>
                                
//                                 <!-- Introduction Text -->
//                                 <tr>
//                                     <td style="padding-bottom: 32px;">
//                                         <p style="margin: 0; font-size: 16px; line-height: 1.6; color: ${BRAND_COLORS.textSecondary}; text-align: center;">
//                                             لإكمال عملية التحقق من حسابك، يرجى استخدام<br>
//                                             رمز التحقق لمرة واحدة (OTP) التالي:
//                                         </p>
//                                     </td>
//                                 </tr>

//                                 <!-- OTP Box -->
//                                 <tr>
//                                     <td align="center" style="padding: 0 0 32px 0;">
//                                         <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BRAND_COLORS.otpBg}; border: 3px solid ${BRAND_COLORS.otpBorder}; border-radius: 12px; box-shadow: 0 2px 8px rgba(26, 115, 232, 0.15);">
//                                             <tr>
//                                                 <td style="padding: 28px 48px;">
//                                                     <p style="margin: 0; font-size: 42px; font-weight: 700; color: ${BRAND_COLORS.primary}; letter-spacing: 12px; text-align: center; font-family: 'Courier New', Courier, monospace;">
//                                                         ${otp}
//                                                     </p>
//                                                 </td>
//                                             </tr>
//                                         </table>
//                                     </td>
//                                 </tr>

//                                 <!-- Security Notice -->
//                                 <tr>
//                                     <td style="padding: 24px 0; border-top: 2px solid ${BRAND_COLORS.border}; border-bottom: 2px solid ${BRAND_COLORS.border};">
//                                         <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
//                                             <tr>
//                                                 <td style="padding: 0 0 12px 0;">
//                                                     <p style="margin: 0; font-size: 15px; font-weight: 600; color: ${BRAND_COLORS.textPrimary}; text-align: center;">
//                                                         ⚠️ تنبيه أمني هام
//                                                     </p>
//                                                 </td>
//                                             </tr>
//                                             <tr>
//                                                 <td>
//                                                     <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${BRAND_COLORS.textSecondary}; text-align: center;">
//                                                         • هذا الرمز صالح لمدة <strong style="color: ${BRAND_COLORS.primary};">15 دقيقة فقط</strong><br>
//                                                         • لا تشارك هذا الرمز مع أي شخص<br>
//                                                         • لن نطلب منك هذا الرمز عبر الهاتف أو البريد
//                                                     </p>
//                                                 </td>
//                                             </tr>
//                                         </table>
//                                     </td>
//                                 </tr>

//                                 <!-- Security Image -->
//                                 <tr>
//                                     <td align="center" style="padding: 32px 0 24px 0;">
//                                         <img src="${SECURITY_IMAGE_URL}" alt="الأمان والحماية" width="100%" style="display: block; max-width: 100%; height: auto; border-radius: 12px; border: 0;">
//                                     </td>
//                                 </tr>

//                                 <!-- Help Text -->
//                                 <tr>
//                                     <td style="padding: 0 0 24px 0;">
//                                         <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${BRAND_COLORS.textSecondary}; text-align: center;">
//                                             إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.<br>
//                                             حسابك آمن ولا داعي لاتخاذ أي إجراء.
//                                         </p>
//                                     </td>
//                                 </tr>

//                                 <!-- Thank You -->
//                                 <tr>
//                                     <td style="padding-top: 12px;">
//                                         <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${BRAND_COLORS.primary}; text-align: center;">
//                                             شكراً لاستخدامك ${COMPANY_NAME} 💙
//                                         </p>
//                                     </td>
//                                 </tr>
//                             </table>

//                         </td>
//                     </tr>

//                     <!-- Footer -->
//                     <tr>
//                         <td style="background-color: ${BRAND_COLORS.background}; padding: 32px 40px; border-top: 1px solid ${BRAND_COLORS.border};">
//                             <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
//                                 <tr>
//                                     <td align="center" style="padding-bottom: 12px;">
//                                         <p style="margin: 0; font-size: 13px; color: ${BRAND_COLORS.textSecondary}; line-height: 1.5;">
//                                             © ${new Date().getFullYear()} <strong>${COMPANY_NAME}</strong>. جميع الحقوق محفوظة.
//                                         </p>
//                                     </td>
//                                 </tr>
//                                 <tr>
//                                     <td align="center">
//                                         <p style="margin: 0; font-size: 12px; color: ${BRAND_COLORS.textSecondary}; line-height: 1.5;">
//                                             هذه رسالة آلية، يرجى عدم الرد عليها مباشرة.
//                                         </p>
//                                     </td>
//                                 </tr>
//                             </table>
//                         </td>
//                     </tr>

//                 </table>
//                 <!-- End Main Container -->

//                 <!-- Spacer for email clients -->
//                 <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px;">
//                     <tr>
//                         <td style="padding: 20px 0;">
//                             <p style="margin: 0; font-size: 11px; color: #999; text-align: center; line-height: 1.5;">
//                                 لأفضل تجربة، يرجى عرض هذا البريد في برنامج بريد إلكتروني حديث.
//                             </p>
//                         </td>
//                     </tr>
//                 </table>

//             </td>
//         </tr>
//     </table>
//     <!-- End Wrapper -->

// </body>
// </html>
//     `;
// };

// // Function to send OTP
// const sendOtp = async (email, phone, otp, type) => {
//   if (type === "email") {
//     const htmlContent = generateOtpEmailHtml(otp);

//     const mailOptions = {
//       from: `"${process.env.EMAIL_SENDER_NAME || 'Bashra AI'}" <${process.env.EMAIL_USER}>`,
//       to: email,
//       subject: '🔐 رمز التحقق الخاص بك - OTP',
//       html: htmlContent, 
//       text: `رمز التحقق الخاص بك هو: ${otp}\n\nهذا الرمز صالح لمدة 15 دقيقة فقط.\nيرجى عدم مشاركة هذا الرمز مع أي شخص.\n\nإذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.`, 
//     };

//     return new Promise((resolve, reject) => {
//       transporter.sendMail(mailOptions, (error, info) => {
//         if (error) {
//           console.error('❌ Error sending email OTP:', error);
//           reject(error);
//         } else {
//           console.log('✅ Email OTP sent successfully:', info.response);
//           resolve(info);
//         }
//       });
//     });

//   } else if (type === "phone") {
//     try {
//       const formattedPhone = formatPhoneNumber(phone);
//       const response = await axios({
//         method: 'POST',
//         url: 'https://mywhinlite.p.rapidapi.com/sendmsg',
//         headers: {
//           'x-rapidapi-key': process.env.RAPIDAPI_KEY,
//           'x-rapidapi-host': 'mywhinlite.p.rapidapi.com',
//           'Content-Type': 'application/json'
//         },
//         data: {
//           phone_number_or_group_id: formattedPhone,
//           is_group: false,
//           message: `رمز التحقق الخاص بك: ${otp}\nصالح لمدة 15 دقيقة فقط.\n\n${process.env.COMPANY_NAME || 'Bashra AI'}`,
//         }
//       });

//       console.log('✅ SMS OTP sent successfully:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Error sending SMS OTP:', error.response?.data || error.message);
//       throw error;
//     }
//   } else {
//     throw new Error("Invalid type provided. Use 'email' or 'phone'.");
//   }
// };

// module.exports = { sendOtp, generateOtp };


























// const nodemailer = require('nodemailer');
// const axios = require('axios');
// require('dotenv').config(); // Loads environment variables


// const formatPhoneNumber = (phone) => {
//   return phone.replace(/^\+/, '').replace(/\s+/g, '').replace(/-/g, '');
// };


// const transporter = nodemailer.createTransport({
//   host: "mail.bashraai.com",
//   port: 465,
//   secure: true, 
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });


// // Function to generate OTP
// const generateOtp = () => {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// };


// // 💡 دالة لإنشاء قالب الإيميل بصيغة HTML بتصميم احترافي
// const generateOtpEmailHtml = (otp) => {
//     // ⚠️ ملاحظة: يجب استبدال الرابطين التاليين بروابط حقيقية:
//     // 1. YOUR_LOGO_URL: رابط اللوجو الخاص بك (يجب أن يكون مستضافاً على الإنترنت)
//     // 2. IMAGE_URL_FOR_SECURITY: رابط صورة توضيحية للأمان أو التحقق
//     const LOGO_URL = "https://front-bashrax.vercel.app/assets/images/x4.png"; // استبدل هذا
//     const SECURITY_IMAGE_URL = "https://front-bashra-ai.vercel.app/16.webp"; // استبدل هذا

//     return `
//         <!DOCTYPE html>
//         <html lang="ar" dir="rtl">
//         <head>
//             <meta charset="UTF-8">
//             <meta name="viewport" content="width=device-width, initial-scale=1.0">
//             <title>رمز التحقق الخاص بك</title>
//             </head>
//         <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; text-align: right; direction: rtl;">

//             <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f6;">
//                 <tr>
//                     <td align="center" style="padding: 20px 0;">
                        
//                         <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                            
//                             <tr>
//                                 <td style="background-color: #007bff; padding: 20px 30px; text-align: center;">
//                                     <a href="#" target="_blank" style="text-decoration: none;">
//                                         <img src="${LOGO_URL}" alt="[اسم شركتك] Logo" width="150" style="display: block; border: 0; max-width: 150px; height: auto;">
//                                     </a>
//                                 </td>
//                             </tr>

//                             <tr>
//                                 <td style="padding: 30px 40px; color: #333333;">
                                    
//                                     <h1 style="font-size: 24px; color: #007bff; margin-top: 0; margin-bottom: 20px; font-weight: 600;">تحقق من حسابك</h1>
                                    
//                                     <p style="font-size: 16px; line-height: 1.7; margin-bottom: 25px;">
//                                         مرحباً، <br>
//                                         لإكمال عملية تسجيل الدخول أو تأكيد العملية، يرجى استخدام رمز التحقق لمرة واحدة (**OTP**) التالي.
//                                     </p>

//                                     <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
//                                         <tr>
//                                             <td align="center">
//                                                 <div style="background-color: #e6f7ff; border: 2px solid #b3e0ff; border-radius: 8px; padding: 20px; display: inline-block;">
//                                                     <p style="margin: 0; font-size: 36px; font-weight: 700; color: #007bff; letter-spacing: 8px;">
//                                                         ${otp}
//                                                     </p>
//                                                 </div>
//                                             </td>
//                                         </tr>
//                                     </table>

//                                     <p style="font-size: 14px; line-height: 1.6; color: #555555; border-top: 1px solid #eeeeee; padding-top: 20px;">
//                                         **ملاحظة هامة:** هذا الرمز صالح لمدة **15 دقيقة فقط**. يرجى عدم مشاركة هذا الرمز مع أي شخص لضمان أمان حسابك.
//                                     </p>

//                                     <div style="text-align: center; margin-top: 25px; margin-bottom: 25px;">
//                                         <img src="${SECURITY_IMAGE_URL}" alt="صورة توضيحية للأمان" width="100%" style="max-width: 500px; height: auto; border-radius: 8px;">
//                                     </div>
                                    
//                                     <p style="font-size: 15px; font-weight: 500; color: #007bff;">شكراً لك لاختيار خدماتنا.</p>
//                                 </td>
//                             </tr>

//                             <tr>
//                                 <td align="center" style="background-color: #eeeeee; padding: 15px 30px; font-size: 12px; color: #777777; border-top: 1px solid #dddddd;">
//                                     <p style="margin: 0;">© ${new Date().getFullYear()} [اسم شركتك]. جميع الحقوق محفوظة.</p>
//                                     <p style="margin: 5px 0 0;">هذه الرسالة تم إرسالها آلياً. يرجى عدم الرد على هذا البريد الإلكتروني.</p>
//                                 </td>
//                             </tr>

//                         </table>
//                     </td>
//                 </tr>
//             </table>
//         </body>
//         </html>
//     `;
// };


// // Function to send OTP
// const sendOtp = async (email, phone, otp, type) => {
//   if (type === "email") {
//     // استخدام دالة إنشاء قالب HTML
//     const htmlContent = generateOtpEmailHtml(otp);

//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: 'رمز التحقق لمرة واحدة (OTP) الخاص بك',
//       html: htmlContent, 
//       text: `رمز التحقق الخاص بك هو ${otp}. وهو صالح لمدة 15 دقيقة.`, 
//     };

//     transporter.sendMail(mailOptions, (error, info) => {
//       if (error) {
//         console.log('Error sending email OTP:', error);
//       } else {
//         console.log('Email OTP sent:', info.response);
//       }
//     });


//   } else if (type === "phone") {
//     // الكود الخاص بإرسال رسالة SMS لم يتغير
//     try {
//         // ... (بقية كود SMS)
//       const formattedPhone = formatPhoneNumber(phone);
//       const response = await axios({
//         method: 'POST',
//         url: 'https://mywhinlite.p.rapidapi.com/sendmsg',
//         headers: {
//           'x-rapidapi-key': process.env.RAPIDAPI_KEY,
//           'x-rapidapi-host': 'mywhinlite.p.rapidapi.com',
//           'Content-Type': 'application/json'
//         },
//         data: {
//           phone_number_or_group_id: formattedPhone,
//           is_group: false,
//           message: `Your OTP code is ${otp}. It is valid for 15 minutes.`,
//         }
//       });

//       console.log('SMS OTP sent via RapidAPI:', response.data);
//     } catch (error) {
//       console.error('Error sending SMS OTP via RapidAPI:', error.response?.data || error.message);
//     }
//   } else {
//     console.warn("Invalid type provided. Use 'email' or 'phone'.");
//   }
// };


// module.exports = { sendOtp, generateOtp };






























// const nodemailer = require('nodemailer');
// const axios = require('axios');
// require('dotenv').config(); // Loads environment variables


// const formatPhoneNumber = (phone) => {
//   return phone.replace(/^\+/, '').replace(/\s+/g, '').replace(/-/g, '');
// };


// const transporter = nodemailer.createTransport({
//   host: "mail.bashraai.com",
//   port: 465,
//   secure: true, 
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });


// // Function to generate OTP
// const generateOtp = () => {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// };


// // 💡 دالة إضافية لإنشاء قالب الإيميل بصيغة HTML
// // يمكن استبدال هذه الدالة باستدعاء لقالب جاهز (مثل ملف .hbs أو .ejs) إذا كنت تستخدم محرك قوالب.
// const generateOtpEmailHtml = (otp) => {
//     return `
//         <!DOCTYPE html>
//         <html lang="en">
//         <head>
//             <meta charset="UTF-8">
//             <meta name="viewport" content="width=device-width, initial-scale=1.0">
//             <title>رمز التحقق لمرة واحدة (OTP)</title>
//             <style>
//                 body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
//                 .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
//                 .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee; }
//                 .otp-code { font-size: 32px; font-weight: bold; color: #007bff; background-color: #e9f5ff; padding: 15px; border-radius: 4px; display: inline-block; letter-spacing: 5px; margin: 20px 0; }
//                 .content { text-align: right; line-height: 1.6; color: #333333; }
//                 .footer { text-align: center; margin-top: 20px; padding-top: 10px; font-size: 12px; color: #777777; border-top: 1px solid #eeeeee; }
//             </style>
//         </head>
//         <body>
//             <div class="container" style="direction: rtl; text-align: right;">
//                 <div class="header">
//                     <h2>رمز التحقق الخاص بك (OTP)</h2>
//                 </div>
//                 <div class="content">
//                     <p>مرحباً،</p>
//                     <p>لإكمال عملية التحقق، يرجى استخدام رمز الـ **OTP** التالي:</p>
//                     <div style="text-align: center;">
//                         <span class="otp-code">${otp}</span>
//                     </div>
//                     <p>هذا الرمز صالح لمدة **15 دقيقة**. يرجى عدم مشاركة هذا الرمز مع أي شخص.</p>
//                     <p>شكراً لك.</p>
//                 </div>
//                 <div class="footer">
//                     هذه الرسالة تم إرسالها آلياً، يرجى عدم الرد عليها.
//                 </div>
//             </div>
//         </body>
//         </html>
//     `;
// };


// // Function to send OTP
// const sendOtp = async (email, phone, otp, type) => {
//   if (type === "email") {
//     // 💡 استخدام دالة إنشاء قالب HTML
//     const htmlContent = generateOtpEmailHtml(otp);

//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: 'Your OTP Code - رمز التحقق الخاص بك',
//       // 💡 إضافة خاصية html
//       html: htmlContent, 
//       // 💡 من الجيد ترك خاصية text كنسخة احتياطية في حال لم يتمكن العميل من عرض HTML
//       text: `Your OTP code is ${otp}. It is valid for 15 minutes.`, 
//     };

//     transporter.sendMail(mailOptions, (error, info) => {
//       if (error) {
//         console.log('Error sending email OTP:', error);
//       } else {
//         console.log('Email OTP sent:', info.response);
//       }
//     });


//   } else if (type === "phone") {
//     try {


//       const formattedPhone = formatPhoneNumber(phone);
//       // console.log("الرقم تمام",formattedPhone);

//       const response = await axios({
//         method: 'POST',
//         url: 'https://mywhinlite.p.rapidapi.com/sendmsg',
//         headers: {
//           'x-rapidapi-key': process.env.RAPIDAPI_KEY,
//           'x-rapidapi-host': 'mywhinlite.p.rapidapi.com',
//           'Content-Type': 'application/json'
//         },
//         data: {
//           phone_number_or_group_id: formattedPhone,
//           is_group: false,
//           message: `Your OTP code is ${otp}. It is valid for 15 minutes.`,
//         }
//       });

//       console.log('SMS OTP sent via RapidAPI:', response.data);
//     } catch (error) {
//       console.error('Error sending SMS OTP via RapidAPI:', error.response?.data || error.message);
//     }
//   } else {
//     console.warn("Invalid type provided. Use 'email' or 'phone'.");
//   }
// };


// module.exports = { sendOtp, generateOtp };






































// const nodemailer = require('nodemailer');
// const axios = require('axios');
// require('dotenv').config(); // Loads environment variables


// const formatPhoneNumber = (phone) => {
//   return phone.replace(/^\+/, '').replace(/\s+/g, '').replace(/-/g, '');
// };

// // Set up email transport
// // const transporter = nodemailer.createTransport({
// //   host: "smtp.hostinger.com",
// //   port: 465,
// //   secure: true, 
// //   auth: {
// //     user: process.env.EMAIL_USER,
// //     pass: process.env.EMAIL_PASS,
// //   },
// // });


// const transporter = nodemailer.createTransport({
//   host: "mail.bashraai.com",
//   port: 465,
//   secure: true, 
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });


// // Function to generate OTP
// const generateOtp = () => {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// };

// // const phone2=201003226502;

// // Function to send OTP
// const sendOtp = async (email, phone, otp, type) => {
//   if (type === "email") {
//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: 'Your OTP Code',
//       text: `Your OTP code is ${otp}. It is valid for 15 minutes.`,
//     };

//     transporter.sendMail(mailOptions, (error, info) => {
//       if (error) {
//         console.log('Error sending email OTP:', error);
//       } else {
//         console.log('Email OTP sent:', info.response);
//       }
//     });


//   } else if (type === "phone") {
//     try {

//       // const phone=201003226502;

//       //   const formattedPhone = phone.startsWith("+") ? phone.slice(1) : phone;
//       // console.log("phone2",formattedPhone);

//       const formattedPhone = formatPhoneNumber(phone);
//       // console.log("الرقم تمام",formattedPhone);

//       const response = await axios({
//         method: 'POST',
//         url: 'https://mywhinlite.p.rapidapi.com/sendmsg',
//         headers: {
//           'x-rapidapi-key': process.env.RAPIDAPI_KEY,
//           'x-rapidapi-host': 'mywhinlite.p.rapidapi.com',
//           'Content-Type': 'application/json'
//         },
//         data: {
//           phone_number_or_group_id: formattedPhone,
//           is_group: false,
//           message: `Your OTP code is ${otp}. It is valid for 15 minutes.`,
//         }
//       });

//       console.log('SMS OTP sent via RapidAPI:', response.data);
//     } catch (error) {
//       console.error('Error sending SMS OTP via RapidAPI:', error.response?.data || error.message);
//     }
//   } else {
//     console.warn("Invalid type provided. Use 'email' or 'phone'.");
//   }
// };


// module.exports = { sendOtp, generateOtp };


// // +201023905933

// // 201023905933

// // +20 10 23905933

// // 20 10 23905933


// // else if (type === "phone") {
// //   // Use TextFlow API
// //   const textflowUrl = "https://textflow.me/api/bulk-sms";
// //   const phoneNumbers = [phone.startsWith('+') ? phone : `+${phone}`]; // Ensure it starts with +

// //   try {
// //     const response = await axios.post(
// //       textflowUrl,
// //       {
// //         phone_numbers: phoneNumbers,
// //         text: `Your OTP code is ${otp}. It is valid for 5 minutes.`
// //       },
// //       {
// //         headers: {
// //           "Authorization": `Bearer ${process.env.TEXTFLOW_API_KEY}`,
// //           "Content-Type": "application/json"
// //         }
// //       }
// //     );

// //     console.log('SMS OTP sent via TextFlow:', response.data);
// //   } catch (error) {
// //     console.error('Error sending SMS OTP via TextFlow:', error.response?.data || error.message);
// //   }
// // }
// // };




// // else if (type === "phone") {
// //   try {
// //     const response = await axios.post('https://textbelt.com/text', {
// //       phone: phone,
// //       message: `Your OTP code is ${otp}. It is valid for 5 minutes.`,
// //       key: process.env.TEXTBELT_API_KEY || 'textbelt', // 'textbelt' is the free key
// //     });

// //     console.log('SMS OTP sent via TextBelt:', response.data);
// //   } catch (error) {
// //     console.error('Error sending SMS OTP via TextBelt:', error.response?.data || error.message);
// //   }
// // }
// // };







// // else if (type === "phone") {
// //   try {
// //     const response = await axios({
// //       method: 'POST',
// //       url: 'https://sms-verify3.p.rapidapi.com/send-numeric-verify',
// //       headers: {
// //         'x-rapidapi-key': process.env.RAPIDAPI_KEY, // Use environment variable for security
// //         'x-rapidapi-host': 'sms-verify3.p.rapidapi.com',
// //         'Content-Type': 'application/json'
// //       },
// //       data: {
// //         target: phone, // Ensure this is in international format, e.g., '+447459034784'
// //         numeric: otp // Add the OTP to send
// //       }
// //     });

// //     console.log('SMS OTP sent via RapidAPI:', response.data);
// //   } catch (error) {
// //     console.error('Error sending SMS OTP via RapidAPI:', error.response?.data || error.message);
// //   }
// // }
// // };












// // else if (type === "phone") {
// //   try {
// //     const response = await axios({
// //       method: 'GET',
// //       url: 'https://getotp-co-send-otps-via-whatsapp-globally-for-free.p.rapidapi.com/api',
// //       params: {
// //         key: process.env.GETOTP_API_KEY,
// //         otp: otp,
// //         to: phone // e.g., +447459034784
// //       },
// //       headers: {
// //         'x-rapidapi-key': process.env.WHATSAPP_API_KEY,
// //         'x-rapidapi-host': 'getotp-co-send-otps-via-whatsapp-globally-for-free.p.rapidapi.com'
// //       }
// //     });

// //     console.log('WhatsApp OTP sent:', response.data);
// //   } catch (error) {
// //     console.error('Error sending WhatsApp OTP:', error.response?.data || error.message);
// //   }
// // }
// // };