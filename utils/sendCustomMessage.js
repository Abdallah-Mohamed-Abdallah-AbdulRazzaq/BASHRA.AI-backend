// utils/sendCustomMessage.js
const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();

// Format phone numbers consistently
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

// Send a custom message via email
const sendEmailMessage = async (email, message) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Account Notification',
    text: message,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending custom email:', error);
    } else {
      console.log(`Email sent to ${email}: ${info.response}`);
    }
  });
};

// Send a custom message via SMS or WhatsApp
const sendPhoneMessage = async (phone, message) => {
  try {
    const formattedPhone = formatPhoneNumber(phone);

    const response = await axios({
      method: 'POST',
      url: 'https://mywhinlite.p.rapidapi.com/sendmsg',
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'mywhinlite.p.rapidapi.com',
        'Content-Type': 'application/json',
      },
      data: {
        phone_number_or_group_id: formattedPhone,
        is_group: false,
        message,
      },
    });

    console.log(`SMS/WhatsApp message sent to ${formattedPhone}:`, response.data);
  } catch (error) {
    console.error('Error sending custom phone message:', error.response?.data || error.message);
  }
};

module.exports = {
  sendEmailMessage,
  sendPhoneMessage,
};
