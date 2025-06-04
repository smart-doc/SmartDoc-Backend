const generateTokenAndSetCookie = require("../utils/generateTokenAndSetCookie.js");
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer')
const crypto = require("crypto")
require("dotenv").config();
const path = require('path');
const Role = require("../models/Role.js")
const{ User} = require ("../models/User.js")
const jwt = require("jsonwebtoken")
const OTPVerification = require("../models/OTPVerification.js")
const { sendEmail } = require('../controllers/emailController.js');


const generateOTP = (length = 6) => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const verificationRecord = await OTPVerification.findOne({ userId: user._id });
    if (!verificationRecord) {
      return res.status(404).json({ 
        success: false, 
        message: 'Verification record not found' 
      });
    }

    const { otp: hashedOTP, expiresAt } = verificationRecord;

    if (expiresAt < Date.now()) {
      await OTPVerification.deleteOne({ userId: user._id });
      return res.status(400).json({ 
        success: false, 
        message: 'OTP has expired' 
      });
    }

    const isMatch = await bcrypt.compare(otp, hashedOTP);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP' 
      });
    }

    await User.updateOne({ _id: user._id }, { emailVerified: true });
    await OTPVerification.deleteOne({ userId: user._id });

    return res.status(200).json({ 
      success: true, 
      message: 'Email verified successfully' 
    });
  } catch (error) {
    console.error('Error during OTP verification:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during verification' 
    });
  }
};

const resendVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    await OTPVerification.deleteMany({ userId: user._id });

    await OTPVerification.create({
      userId: user._id,
      otp: hashedOTP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
    });

    const emailHtml = `
      <p><strong>Hi there</strong>,<br>
      Thank you for signing up on SmartDoc.<br>
      Your verification OTP is: <strong>${otp}</strong><br>
      This OTP will expire in 30 minutes.<br>
      If you did not sign up for a SmartDoc account, you can safely ignore this email.<br><br><br>
      Best,<br>
      The SmartDoc Team</p>
    `;

    await sendEmail(email, "SmartDoc Email Verification OTP", emailHtml);

    res.status(200).json({ message: "Verification OTP has been sent to your email" });
  } catch (error) {
    console.error("Error in resendVerificationOTP endpoint:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);
    
    user.resetPasswordToken = hashedOTP;
    user.resetPasswordExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const emailHtml = `
      <p><strong>Hello ${user.firstName},</strong></p><br>
      <p>You have requested a password reset for your SmartDoc account.</p><br>
      <p>Your password reset OTP is: <strong>${otp}</strong></p>
      <p>This OTP will expire in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email.</p><br>
      <p>Best regards,<br>The SmartDoc Team</p>
    `;

    await sendEmail(email, 'SmartDoc Password Reset OTP', emailHtml);

    res.status(200).json({
      message: "Password reset OTP has been sent to your email"
    });
  } catch (error) {
    console.error("Error in forgot password controller:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmNewPassword } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    if (!newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: "New password and confirm new password are required" });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "New password and confirm new password do not match" });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: "Password must contain at least one uppercase letter and one special character."
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User with this email does not exist" });
    }

    if (!user.resetPasswordToken || !user.resetPasswordExpiry) {
      return res.status(400).json({ message: "No password reset request was initiated" });
    }

    if (user.resetPasswordExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordToken);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Error in reset password controller: ", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const adminRegister = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must contain at least one uppercase letter and one special character.',
      });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: "Email is already taken" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userRole = await Role.findOne({ name: 'Admin' });

    const newUser = new User({
      firstName,
      lastName,
      email,
      type: "Admin",
      password: hashedPassword,
      emailVerified: false,
      role: userRole._id
    });

    await newUser.save();

    const populatedUser = await User.findById(newUser._id).populate('role');

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    await OTPVerification.create({
      userId: newUser._id,
      otp: hashedOTP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
    });

    const emailHtml = `
      <p><strong>Hi there</strong>,<br>
      Thank you for signing up on SmartDoc.<br>
      Your verification OTP is: <strong>${otp}</strong><br>
      This OTP will expire in 30 minutes.<br>
      If you did not sign up for a SmartDoc account, you can safely ignore this email.<br><br><br>
      Best,<br>
      The SmartDoc Team</p>
    `;

    await sendEmail(email, 'SmartDoc Verification OTP', emailHtml);

    res.status(201).json({
      message: 'User created. Verification OTP sent to your email.',
      token: jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '15d' }),
      user: {
        _id: populatedUser._id,
        firstName: populatedUser.firstName,
        lastName: populatedUser.lastName,
        email: populatedUser.email,
        type: populatedUser.type,
        role: {
          _id: populatedUser.role._id,
          name: populatedUser.role.name
        }
      },
    });
  } catch (error) {
    console.error("Error in adminRegister controller:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const hospitalRegister = async (req, res) => {
    try{
        const { hospitalName, phoneNumber, email, password, address, city, state, country, postalCode, latitude, longitude, 
            registrationNumber, website, description, specialties, emergencyServices, bedCapacity, accreditation, open24Hours, schedule
        } = req.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must contain at least one uppercase letter and one special character.',
      });
    }

    if (phoneNumber.length !== 11) {
      return res.status(400).json({ error: "Phone Number must be 11 digits long" });
    }

    const existingPhoneNumber = await User.findOne({ phoneNumber });
    if (existingPhoneNumber) {
      return res.status(400).json({ error: "A user already has this phone number. Kindly use another" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: "Email is already taken" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userRole = await Role.findOne({ name: 'Hospital' });

    const newUser = new User({
      hospitalName, 
      phoneNumber, 
      email, 
      address, 
      city, 
      state, 
      country, 
      postalCode, 
      latitude, 
      longitude,   
      registrationNumber, 
      website, 
      description, 
      specialties, 
      emergencyServices, 
      bedCapacity, 
      accreditation, 
      open24Hours,
      schedule,
      status: "active",
      type: "Hospital",
      password: hashedPassword,
      isEmailVerified: false,
      role: userRole._id
    });

    await newUser.save();

    const populatedUser = await User.findById(newUser._id).populate('role');

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    await OTPVerification.create({
      userId: newUser._id,
      otp: hashedOTP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
    });

    const emailHtml = `
      <p><strong>Hi there</strong>,<br>
      Thank you for signing up on SmartDoc.<br>
      Your verification OTP is: <strong>${otp}</strong><br>
      This OTP will expire in 30 minutes.<br>
      If you did not sign up for a SmartDoc account, you can safely ignore this email.<br><br><br>
      Best,<br>
      The SmartDoc Team</p>
    `;

    await sendEmail(email, 'SMARTDOC Verification OTP', emailHtml);

    res.status(201).json({
      message: 'User created. Verification OTP sent to your email.',
      token: jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '15d' }),
      user: {
        _id: populatedUser._id,
        hospitalName: populatedUser.hospitalName,
        email: populatedUser.email,
        type: populatedUser.type,
        phoneNumber: populatedUser.phoneNumber,
        role: {
          _id: populatedUser.role._id,
          name: populatedUser.role.name
        }
      },
      });
    } catch (error) {
        console.error("Error in hospitalSignUp controller:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const doctorRegister = async (req, res) => {
    try {
        const { firstName, lastName, email, password, hospitalId, phoneNumber, specialization, bio } = req.body;

        if (!firstName || !lastName || !email || !password || !hospitalId || !phoneNumber || !specialization) {
            return res.status(400).json({ error: "All required fields must be provided" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters long" });
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: 'Password must contain at least one uppercase letter and one special character.',
            });
        }

        if (phoneNumber.length !== 11) {
            return res.status(400).json({ error: "Phone Number must be 11 digits long" });
        }

        // Validate hospitalId - check if it exists and is of type "Hospital"
        const hospital = await User.findById(hospitalId);
        if (!hospital) {
            return res.status(400).json({ error: "Hospital not found" });
        }

        if (hospital.type !== "Hospital") {
            return res.status(400).json({ error: "Invalid hospital ID. The provided ID does not belong to a hospital" });
        }

        const existingPhoneNumber = await User.findOne({ phoneNumber });
        if (existingPhoneNumber) {
            return res.status(400).json({ error: "A user already has this phone number. Kindly use another" });
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ error: "Email is already taken" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Find doctor role instead of admin role for doctors
        const userRole = await Role.findOne({ name: 'Doctor' });
        if (!userRole) {
            return res.status(500).json({ error: "Doctor role not found in the system" });
        }

        const newUser = new User({
            firstName,
            lastName,
            email,
            hospitalId,
            phoneNumber,
            specialization,
            bio,
            type: "Doctor",
            password: hashedPassword,
            emailVerified: false,
            role: userRole._id
        });

        await newUser.save();

        const populatedUser = await User.findById(newUser._id).populate('role');

        const otp = generateOTP();
        const hashedOTP = await bcrypt.hash(otp, 10);

        await OTPVerification.create({
            userId: newUser._id,
            otp: hashedOTP,
            createdAt: Date.now(),
            expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
        });

        const emailHtml = `
        <p><strong>Hi there</strong>,<br>
        Thank you for signing up on SmartDoc.<br>
        Your verification OTP is: <strong>${otp}</strong><br>
        This OTP will expire in 30 minutes.<br>
        If you did not sign up for a SmartDoc account, you can safely ignore this email.<br><br><br>
        Best,<br>
        The SmartDoc Team</p>
        `;

        await sendEmail(email, 'SmartDoc Verification OTP', emailHtml);

        res.status(201).json({
            message: 'Doctor registered successfully. Verification OTP sent to your email.',
            token: jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '15d' }),
            user: {
                _id: populatedUser._id,
                firstName: populatedUser.firstName,
                lastName: populatedUser.lastName,
                email: populatedUser.email,
                hospitalId: populatedUser.hospitalId,
                specialization: populatedUser.specialization,
                type: populatedUser.type,
                role: {
                    _id: populatedUser.role._id,
                    name: populatedUser.role.name
                }
            },
        });
    } catch (error) {
        console.error("Error in doctorRegister controller:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const patientRegister = async (req, res) => {
    try{
        const {firstName, lastName, email, password, phoneNumber, dateOfBirth, gender, address, city, state, country, postalCode, emmergencyContactName,
            emmergencyContactPhoneNumber, emmergencyContactRelationship, bloodGroup, height_CM, weight_KG, preferredLanguage, insuranceProvider,
             insurancePolicyNumber, dataConsent
        } = req.body;

         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
        }

        if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
        if (!passwordRegex.test(password)) {
        return res.status(400).json({
            message: 'Password must contain at least one uppercase letter and one special character.',
        });
        }

        if (phoneNumber.length !== 11) {
        return res.status(400).json({ error: "Phone Number must be 11 digits long" });
        }

        const existingPhoneNumber = await User.findOne({ phoneNumber });
        if (existingPhoneNumber) {
        return res.status(400).json({ error: "A user already has this phone number. Kindly use another" });
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
        return res.status(400).json({ error: "Email is already taken" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userRole = await Role.findOne({ name: 'Patient' });

        const newUser = new User({
        firstName,
        lastName,
        email,
        dateOfBirth,
        gender, 
        address,
        city,
        state,
        country,
        postalCode,
        emmergencyContactName,
        emmergencyContactPhoneNumber,
        emmergencyContactRelationship,
        bloodGroup,
        height_CM,
        weight_KG,
        preferredLanguage,
        insuranceProvider,
        insurancePolicyNumber,
        dataConsent,
        type: "Patient",
        password: hashedPassword,
        emailVerified: false,
        role: userRole._id
        });

        await newUser.save();

        const populatedUser = await User.findById(newUser._id).populate('role');

        const otp = generateOTP();
        const hashedOTP = await bcrypt.hash(otp, 10);

        await OTPVerification.create({
        userId: newUser._id,
        otp: hashedOTP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
        });

        const emailHtml = `
        <p><strong>Hi there</strong>,<br>
        Thank you for signing up on SmartDoc.<br>
        Your verification OTP is: <strong>${otp}</strong><br>
        This OTP will expire in 30 minutes.<br>
        If you did not sign up for a SmartDoc account, you can safely ignore this email.<br><br><br>
        Best,<br>
        The SmartDoc Team</p>
        `;

        await sendEmail(email, 'SmartDoc Verification OTP', emailHtml);

        res.status(201).json({
        message: 'User created. Verification OTP sent to your email.',
        token: jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '15d' }),
        user: {
            _id: populatedUser._id,
            firstName: populatedUser.firstName,
            lastName: populatedUser.lastName,
            email: populatedUser.email,
            type: populatedUser.type,
            role: {
            _id: populatedUser.role._id,
            name: populatedUser.role.name
            }
        },
        });
    } catch (error) {
        console.error("Error in patientRegister controller:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

const signIn = async (req, res) => {
  try{
    const {email, password} = req.body;
    const user = await User.findOne({email}).populate('role');
    const isPasswordCorrect = await bcrypt.compare(password, user?.password || "")
  
    if(!user || !isPasswordCorrect){
      return res.status(400).json({error: "Invalid username or password"})
    }

    const emailVerified = user.emailVerified

    if (emailVerified === false){
      return res.status(400).json({error: "You have not verified your email. Kindly click here to verify your email"})
    }

    generateTokenAndSetCookie (user._id, res);

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { 
      expiresIn: '15d' 
    });
    
    res.status(200).json({
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        hospitalName: user.hospitalName,
        email: user.email,
        phonenumber: user.phonenumber,
        type: user.type,
        // role: {
        //   _id: user.role._id,
        //   name: user.role.name
        // }
      }
    });

  } catch(error) {
    console.log("error in signin controller", error.message);
    res.status(500).json({ error: "internal Server Error" });
  }
};

const signOut = async (req, res) => {
  try{
    res.cookie("jwt","", {maxAge:0} )
    res.status(200).json({message: "signed out successfully"})
  }catch(error){
    console.log("error in signout controller", error.message);
    res.status(500).json({ error: "internal Server Error" });
  }
};

module.exports = {
  adminRegister, hospitalRegister, patientRegister, doctorRegister, signOut, signIn, resetPassword, forgotPassword, verifyOTP, resendVerificationOTP,
}