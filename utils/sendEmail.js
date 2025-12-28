// utils/sendEmail.js
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'senagulkara@gmail.com', // Kendi mailin
      pass: 'xpkm jxlr vrxg hykp' // Google'dan aldığın kod
    }
  });

  const mailOptions = {
    from: '"Büyülü Kütüphane 🦉" <no-reply@buyulukutuphane.com>',
    to: options.email,
    subject: options.subject,
    html: options.message
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;