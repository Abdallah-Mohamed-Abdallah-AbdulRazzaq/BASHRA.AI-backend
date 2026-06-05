// utils/notifyUnverifiedUsers.js
const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();

// Phone formatting helper
const formatPhoneNumber = (phone) => {
  return phone.replace(/^\+/, '').replace(/\s+/g, '').replace(/-/g, '');
};

// Set up email transport
const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to send account reminder via email
const sendEmailReminder = async (email) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Reminder to Verify Your Account',
    text: `Reminder: Please log in and verify your account to avoid deletion. Your account : ${email}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending verification reminder email:', error);
    } else {
      console.log('Verification reminder email sent:', info.response);
    }
  });
};

// Function to send account reminder via phone
const sendPhoneReminder = async (phone) => {
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
        message: `Reminder: Please log in and verify your account to avoid deletion. Your account : ${phone}`,
      }
    });

    console.log('Verification reminder SMS sent via RapidAPI:', response.data);
  } catch (error) {
    console.error('Error sending SMS reminder via RapidAPI:', error.response?.data || error.message);
  }
};

module.exports = { sendEmailReminder, sendPhoneReminder };
