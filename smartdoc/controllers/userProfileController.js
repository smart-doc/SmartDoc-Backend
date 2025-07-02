const {User, UserStatus, Gender, BloodGroup} = require("../models/User.js");
const bcrypt = require("bcrypt");
const Upload = require("../config/multer.js")
const {FileUtility} = require("../utils/fileUtility.js");
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const Role = require("../models/Role.js");
const fs = require('fs').promises;
const crypto = require('crypto');
const mongoose = require('mongoose');
const { sendEmail } = require('../utils/emailUtility.js');


const getSignedinUserProfile = async (req, res) => {
  try{
    const user = await User.findById(req.user._id).select("-password")
    res.status(200).json(user);
  } catch(error) {
    console.log("Error in getUser controller", error.message);
    res.status(500).json({error: "Internal server error"});
  }
}

const getUserProfile = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '_id email type emailVerified'
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      _id: user._id,
      email: user.email,
      type: user.type,
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    console.error('Error in getUserProfile:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

const updateUserProfile = async (req, res) => {
  const userId = req.user._id;
  const { currentPassword, newPassword, ...updateFields } = req.body;

  try {
    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Handle password update
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });

      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }

      const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          error: 'Password must contain at least one uppercase letter and one special character.',
        });
      }

      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(newPassword, salt);
    } else if ((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
      return res.status(400).json({ error: 'Please provide both current password and new password' });
    }

    // Parse stringified arrays from FormData
    if (updateFields.specialties) {
      try {
        updateFields.specialties = typeof updateFields.specialties === 'string'
          ? [updateFields.specialties] // Convert single string to array
          : Array.isArray(updateFields.specialties)
          ? updateFields.specialties
          : JSON.parse(updateFields.specialties);
        if (!Array.isArray(updateFields.specialties)) {
          updateFields.specialties = [updateFields.specialties];
        }
        if (updateFields.specialties.some((spec) => typeof spec !== 'string')) {
          return res.status(400).json({ error: 'Specialties must be an array of strings' });
        }
      } catch (error) {
        console.error('Error parsing specialties:', error);
        return res.status(400).json({ error: 'Invalid specialties format' });
      }
    }

    if (updateFields.hospitalId && user.type === 'Doctor') {
      if (!mongoose.isValidObjectId(updateFields.hospitalId)) {
        return res.status(400).json({ error: 'Invalid hospital ID format' });
      }
      const hospital = await User.findById(updateFields.hospitalId);
      if (!hospital || hospital.type !== 'Hospital') {
        return res.status(400).json({ error: 'Invalid hospital ID. Must belong to an existing hospital' });
      }
    }

    // Validate fields
    if (updateFields.email && updateFields.email !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateFields.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      const existingEmail = await User.findOne({
        email: updateFields.email.toLowerCase(),
        _id: { $ne: userId },
      });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email is already taken by another user' });
      }
      updateFields.email = updateFields.email.toLowerCase().trim();
    }

    if (updateFields.phoneNumber && updateFields.phoneNumber !== user.phoneNumber) {
      if (updateFields.phoneNumber.length > 20) {
        return res.status(400).json({ error: 'Phone number must be 20 characters or less' });
      }
      const existingPhone = await User.findOne({
        phoneNumber: updateFields.phoneNumber,
        _id: { $ne: userId },
      });
      if (existingPhone) {
        return res.status(400).json({ error: 'Phone number is already taken by another user' });
      }
    }

    if (updateFields.registrationNumber && updateFields.registrationNumber !== user.registrationNumber) {
      const existingRegNumber = await User.findOne({
        registrationNumber: updateFields.registrationNumber,
        _id: { $ne: userId },
      });
      if (existingRegNumber) {
        return res.status(400).json({ error: 'Registration number is already taken by another hospital' });
      }
    }

    if (updateFields.dateOfBirth) {
      const dobDate = new Date(updateFields.dateOfBirth);
      if (isNaN(dobDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date of birth format' });
      }
      if (dobDate > new Date()) {
        return res.status(400).json({ error: 'Date of birth cannot be in the future' });
      }
      updateFields.dateOfBirth = dobDate;
    }

    if (updateFields.status && !Object.values(UserStatus).includes(updateFields.status)) {
      return res.status(400).json({ error: `Status must be one of: ${Object.values(UserStatus).join(', ')}` });
    }

    if (updateFields.gender && !Object.values(Gender).includes(updateFields.gender)) {
      return res.status(400).json({ error: `Gender must be one of: ${Object.values(Gender).join(', ')}` });
    }

    if (updateFields.bloodGroup && !Object.values(BloodGroup).includes(updateFields.bloodGroup)) {
      return res.status(400).json({ error: `Blood group must be one of: ${Object.values(BloodGroup).join(', ')}` });
    }

    if (updateFields.height_CM && (updateFields.height_CM < 0 || updateFields.height_CM > 300)) {
      return res.status(400).json({ error: 'Height must be between 0 and 300 cm' });
    }
    if (updateFields.weight_KG && (updateFields.weight_KG < 0 || updateFields.weight_KG > 1000)) {
      return res.status(400).json({ error: 'Weight must be between 0 and 1000 kg' });
    }

    if (updateFields.emergencyContactPhoneNumber && updateFields.emergencyContactPhoneNumber.length > 20) {
      return res.status(400).json({ error: 'Emergency contact phone number must be 20 characters or less' });
    }

    if (updateFields.role && !mongoose.isValidObjectId(updateFields.role)) {
      return res.status(400).json({ error: 'Invalid role ID format' });
    }

    if (updateFields.firstName && updateFields.firstName.length > 100) {
      return res.status(400).json({ error: 'First name must be 100 characters or less' });
    }
    if (updateFields.lastName && updateFields.lastName.length > 100) {
      return res.status(400).json({ error: 'Last name must be 100 characters or less' });
    }

    if (updateFields.city && updateFields.city.length > 100) {
      return res.status(400).json({ error: 'City must be 100 characters or less' });
    }
    if (updateFields.state && updateFields.state.length > 100) {
      return res.status(400).json({ error: 'State must be 100 characters or less' });
    }
    if (updateFields.country && updateFields.country.length > 100) {
      return res.status(400).json({ error: 'Country must be 100 characters or less' });
    }
    if (updateFields.postalCode && updateFields.postalCode.length > 20) {
      return res.status(400).json({ error: 'Postal code must be 20 characters or less' });
    }

    if (updateFields.hospitalName && updateFields.hospitalName.length > 255) {
      return res.status(400).json({ error: 'Hospital name must be 255 characters or less' });
    }
    if (updateFields.website && updateFields.website.length > 255) {
      return res.status(400).json({ error: 'Website must be 255 characters or less' });
    }
    if (updateFields.accreditation && updateFields.accreditation.length > 255) {
      return res.status(400).json({ error: 'Accreditation must be 255 characters or less' });
    }
    if (updateFields.bedCapacity && updateFields.bedCapacity < 0) {
      return res.status(400).json({ error: 'Bed capacity must be non-negative' });
    }

    if (updateFields.specialization && updateFields.specialization.length > 100) {
      return res.status(400).json({ error: 'Specialization must be 100 characters or less' });
    }

    if (updateFields.emergencyContactName && updateFields.emergencyContactName.length > 200) {
      return res.status(400).json({ error: 'Emergency contact name must be 200 characters or less' });
    }
    if (updateFields.emergencyContactRelationship && updateFields.emergencyContactRelationship.length > 50) {
      return res.status(400).json({ error: 'Emergency contact relationship must be 50 characters or less' });
    }
    if (updateFields.preferredLanguage && updateFields.preferredLanguage.length > 50) {
      return res.status(400).json({ error: 'Preferred language must be 50 characters or less' });
    }
    if (updateFields.insuranceProvider && updateFields.insuranceProvider.length > 100) {
      return res.status(400).json({ error: 'Insurance provider must be 100 characters or less' });
    }
    if (updateFields.insurancePolicyNumber && updateFields.insurancePolicyNumber.length > 100) {
      return res.status(400).json({ error: 'Insurance policy number must be 100 characters or less' });
    }

      // Handle document upload for hospitals
        if (req.file && user.type === 'Hospital') {
      // Delete previous document if it exists
      if (user.document) {
        await FileUtility.deleteFile(user.document);
      }
      updateFields.document = req.file.path;

      // Parse the document
      try {
        let doctors = [];
        if (req.file.mimetype === 'text/csv' || req.file.mimetype === 'application/csv') {
          const fileContent = await fs.readFile(req.file.path);
          doctors = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
          });
        } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          const workbook = XLSX.readFile(req.file.path);
          const sheetName = workbook.SheetNames[0];
          doctors = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        }

        // Normalize column names (remove spaces)
        doctors = doctors.map((doctor) => {
          const normalized = {};
          for (const key in doctor) {
            const normalizedKey = key.trim().toLowerCase();
            normalized[normalizedKey] = doctor[key];
          }
          return normalized;
        });

        console.log('Parsed doctors:', doctors);

        // Create Doctor users
        const createdDoctors = [];
        for (const doctor of doctors) {
          const { firstname, lastname, email, specialization } = doctor;
          if (!email) {
            console.log('Skipping doctor without email:', doctor);
            continue;
          }

          const existingDoctor = await User.findOne({ email: email.toLowerCase() });
          if (existingDoctor) {
            console.log('Doctor already exists:', email);
            continue;
          }

          const doctorRole = await Role.findOne({ name: 'Doctor' });
          if (!doctorRole) {
            throw new Error('Doctor role not found in database');
          }

          const doctorUser = new User({
            firstName: firstname,
            lastName: lastname,
            email: email.toLowerCase(),
            type: 'Doctor',
            status: UserStatus.PENDING,
            hospitalId: user._id,
            specialization: specialization || '',
            password: await bcrypt.hash('defaultPassword123!', 10),
            role: doctorRole._id,
          });

          await doctorUser.save();
          createdDoctors.push(doctorUser.email);
          console.log('Created doctor:', doctorUser.email);
        }

        console.log('Created doctors:', createdDoctors);
      } catch (error) {
        console.error('Error parsing document:', error.message);
        // Optionally, fail the request if doctor creation is critical
        return res.status(400).json({ error: `Failed to parse document: ${error.message}` });
      }
    } else if (req.file && user.type !== 'Hospital') {
      await FileUtility.deleteFile(req.file.path); // Cleanup
      return res.status(400).json({ error: 'Document upload is only allowed for Hospital users' });
    } 

    // Update the user document
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password -passwordResetToken -emailVerificationToken');

    if (!updatedUser) {
      if (req.file) await FileUtility.deleteFile(req.file.path); // Cleanup
      return res.status(400).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.log('Error in updateUserProfile:', error.message);
    if (req.file) await FileUtility.deleteFile(req.file.path); // Cleanup
    if (error.message === 'Only audio, image, .csv, and .xlsx files are allowed') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getAllProfiles = async (req, res) => {
  try{
    const allUsers = await User.find()
    return res.status(200).json(allUsers)
  } catch (error){
    console.log("Error in getAllUsers controller: ", error.message);
		res.status(500).json({ error: error.message });
  }
}

const updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const doctorId = req.user.doctorId; // Assumes doctorId in JWT

    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      { fcmToken },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }

    res.json({ success: true, doctor });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getUsersByType = async (req, res) => {
  try {
    const { type } = req.params;
    if (!['Doctor', 'Hospital', 'Patient'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid user type' });
    }

    const users = await User.find({
      $or: [{ type }, { 'role.name': type }],
    })
      .select('name email type role specialty') // Exclude sensitive fields
      .sort({ name: 1 });

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getDoctors = async (req, res) => {
  req.params.type = 'Doctor';
  await getUsersByType(req, res);
};

const getHospitals = async (req, res) => {
  req.params.type = 'Hospital';
  await getUsersByType(req, res);
};

const getPatients = async (req, res) => {
  req.params.type = 'Patient';
  await getUsersByType(req, res);
};

module.exports = { updateUserProfile: [Upload.single('document'), updateUserProfile], getSignedinUserProfile, getUserProfile, getAllProfiles, updateFcmToken, getDoctors, getHospitals, getPatients};
