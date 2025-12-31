import usersModel from "../model/User.js";
import auth from "../utils/auth.js";
import crypto from "crypto";
import { sendEmail } from "../service/emailService.js";

const createUser = async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.email || !req.body.password || !req.body.name) {
      return res.status(400).send({ 
        message: "Name, email, and password are required" 
      });
    }

    // Check if user already exists
    let user = await usersModel.findOne({ email: req.body.email });
    
    if (user) {
      return res.status(400).send({ 
        message: `User with ${req.body.email} already exists!` 
      });
    }

    // Hash the password
    const hashedPassword = await auth.hashData(req.body.password);

    // Create the user
    const newUser = await usersModel.create({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
    });

    // Send welcome email (non-blocking - don't wait for it)
    sendEmail(
      req.body.email,
      "Welcome to QuizMakerPro",
      "Thank you for creating an account with us. We're excited to have you on board!"
    ).catch(err => {
      console.error("Error sending welcome email:", err.message);
      // Don't fail the registration if email fails
    });

    // Respond with success message and new user's ID
    res.status(201).send({
      message: "User Created Successfully",
      userId: newUser._id,
    });
    
  } catch (error) {
    console.error(`Error in ${req.originalUrl}`, error.message);
    res.status(500).send({ 
      message: error.message || "Internal Server Error" 
    });
  }
};

const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({ 
        message: "Email and password are required" 
      });
    }

    let user = await usersModel.findOne({ email: email });
    
    if (!user) {
      return res.status(400).send({
        message: `User with email ${email} does not exist`,
      });
    }

    // Compare password
    const isPasswordValid = await auth.compareHash(user.password, password);
    
    if (!isPasswordValid) {
      return res.status(400).send({
        message: "Incorrect Password",
      });
    }

    // Create token
    const token = auth.createToken({
      email: user.email,
      name: user.name,
      role: user.role,
      id: user._id,
    });

    res.status(200).send({
      message: "Login Successful",
      role: user.role,
      token,
      id: user._id,
    });
    
  } catch (error) {
    console.error(`Error in ${req.originalUrl}`, error.message);
    res.status(500).send({ 
      message: error.message || "Internal Server Error" 
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user by email
    const user = await usersModel.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Set the token and expiry on the user document
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour from now
    await user.save();

    // Create reset URL - Update this URL to match your frontend
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/resetpassword/${resetToken}`;

    // Send email with the reset link
    await sendEmail(
      user.email,
      "Password Reset Request",
      `To reset your password, click the link below:\n\n${resetUrl}\n\nThis link will expire in 1 hour.`
    );

    res.status(200).json({ message: "Reset link sent to your email" });
    
  } catch (error) {
    console.error(`Error in ${req.originalUrl}`, error.message);
    res.status(500).send({ 
      message: error.message || "Internal Server Error" 
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        message: "Token and new password are required" 
      });
    }

    // Find user with the reset token and check if it has expired
    const user = await usersModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Hash the new password before saving
    user.password = await auth.hashData(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: "Password has been reset successfully" });
    
  } catch (error) {
    console.error(`Error in ${req.originalUrl}`, error.message);
    res.status(500).send({ 
      message: error.message || "Internal Server Error" 
    });
  }
};

export default {
  createUser,
  login,
  forgotPassword,
  resetPassword,
};