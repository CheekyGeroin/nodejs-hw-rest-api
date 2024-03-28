const nodemailer = require("nodemailer");

const { MAIL_PASS, MAIL_EMAIL } = process.env;

const nodemailerConfig = {
  host: "smtp.ukr.net",
  port: 465,
  secure: true,
  auth: {
    user: MAIL_EMAIL,
    pass: MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
};

const transport = nodemailer.createTransport(nodemailerConfig);

const sendEmail = async (data) => {
  const email = { ...data, from: "cheekygeroin@ukr.net" };
  await transport.sendMail(email);
  return true;
};

module.exports = sendEmail;
