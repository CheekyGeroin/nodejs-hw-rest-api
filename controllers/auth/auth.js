const { controlWrapper, HttpError, sendEmail } = require("../../helpers");
const { User } = require("../../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const path = require("path");
const fs = require("fs/promises");
const Jimp = require("jimp");
const { v4 } = require("uuid");

const { SECRET_KEY, BASE_URL } = process.env;

const avatarsDir = path.join(__dirname, "../", "../", "public", "avatars");

const register = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user) {
    throw HttpError(409, "Email in use");
  }

  const hashPassword = await bcrypt.hash(password, 10);
  const avatarURL = gravatar.url(email);
  const verificationToken = v4();

  const newUser = await User.create({
    ...req.body,
    password: hashPassword,
    avatarURL,
    verificationToken,
  });

  const verifyEmail = {
    to: email,
    subject: "Verify email",
    html: `<a targer="_blank" href="${BASE_URL}/users/verify/${verificationToken}">Click to verify email</a>`,
  };

  await sendEmail(verifyEmail);

  res.status(201).json({
    user: {
      email: newUser.email,
      subscription: newUser.subscription,
      avatarURL: newUser.avatarURL,
      verificationToken: newUser.verificationToken,
    },
  });
};

const verifyEmail = async (req, res) => {
  const { verificationToken } = req.params;
  const user = await User.findOne({ verificationToken });

  if (!user) {
    throw HttpError(404, "User not found");
  }

  await User.findByIdAndUpdate(user._id, {
    verify: true,
    verificationToken: null,
  });

  res.status(200).json({
    message: "Verification successful",
  });
};

const reVerification = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw HttpError(400, "missing required field email");
  }

  const user = await User.findOne({ email });
  const { verificationToken, verify } = user;

  if (verify) {
    throw HttpError(400, "Verification has already been passed");
  }

  const verifyEmail = {
    to: email,
    subject: "Verify email",
    html: `<a targer="_blank" href="${BASE_URL}/users/verify/${verificationToken}">Click to verify email</a>`,
  };

  await sendEmail(verifyEmail);

  res.status(200).json({
    message: "Verification email sent",
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  const passwordCompare = await bcrypt.compare(password, user.password);

  if (!user || !user.verify || !passwordCompare) {
    throw HttpError(401, "Email is wrong or not verify, or password is wrong");
  }

  const payload = {
    id: user._id,
  };
  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });

  await User.findByIdAndUpdate(user._id, { token });

  res.status(200).json({
    token: token,
    user: {
      email: user.email,
      subscription: user.subscription,
    },
  });
};

const current = async (req, res) => {
  const { _id, email, subscription } = req.user;
  const user = User.findById(_id);

  if (!user) {
    throw HttpError(401, "Not authorized");
  }
  res.json({
    email,
    subscription,
  });
};

const logout = async (req, res) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: null });
  res.status(204).json({
    message: "No content",
  });
};

const updSubscription = async (req, res) => {
  const { _id } = req.user;
  const { subscription } = req.body;

  const condition =
    subscription === "starter" ||
    subscription === "pro" ||
    subscription === "business";

  if (condition) {
    await User.findByIdAndUpdate(_id, { subscription });
  } else {
    throw HttpError(404, "Unknown subscription");
  }

  const user = await User.findById(_id);

  res.status(200).json({
    message: "Subscription updated",
    subscription: user.subscription,
  });
};

const updAvatar = async (req, res) => {
  const { _id } = req.user;
  const { path: tmpUpload, originalname } = req.file;

  const filename = `${_id}_${originalname}`;

  const resultUpload = path.join(avatarsDir, filename);
  await fs.rename(tmpUpload, resultUpload);

  const avatar = await Jimp.read(resultUpload);
  const resizedAvatar = await avatar.resize(250, 250);
  await resizedAvatar.write(resultUpload);

  const avatarURL = path.join("avatars", filename);

  await User.findByIdAndUpdate(_id, { avatarURL });

  res.status(200).json({
    avatarURL,
  });
};

module.exports = {
  register: controlWrapper(register),
  verifyEmail: controlWrapper(verifyEmail),
  reVerification: controlWrapper(reVerification),
  login: controlWrapper(login),
  current: controlWrapper(current),
  logout: controlWrapper(logout),
  updSubscription: controlWrapper(updSubscription),
  updAvatar: controlWrapper(updAvatar),
};
