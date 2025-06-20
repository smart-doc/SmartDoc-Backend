const {User, UserStatus, Gender, BloodGroup} = require("../models/User.js");
const bcrypt = require("bcrypt");
const Upload = require("../config/multer.js")


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
  const { email } = req.params;
    try{
        const user = await User.findOne({ email }).select("-password");
        if (!user) 
          return res.status(400).json({message: "User not found"});

        res.status(200).json(user);
    } catch (error) {
        console.log("error in getUserProfile controller:", error.message)
        res.status(500).json({error: error.message});
    }
}

// const updateUserProfile = async (req, res) => {
//   const userId = req.user._id; // From JWT middleware
//   const { currentPassword, newPassword, ...updateFields } = req.body;

//   try {
//     let user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     if (currentPassword && newPassword) {
//       const isMatch = await bcrypt.compare(currentPassword, user.password);
//       if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });

//       if (newPassword.length < 8) {
//         return res.status(400).json({ error: 'Password must be at least 8 characters long' });
//       }

//       const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
//       if (!passwordRegex.test(newPassword)) {
//         return res.status(400).json({
//           error: 'Password must contain at least one uppercase letter and one special character.',
//         });
//       }

//       const salt = await bcrypt.genSalt(10);
//       user.password = await bcrypt.hash(newPassword, salt);
//     } else if ((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
//       return res.status(400).json({ error: 'Please provide both current password and new password' });
//     }

//     // Handle email update
//     if (updateFields.email && updateFields.email !== user.email) {
//       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//       if (!emailRegex.test(updateFields.email)) {
//         return res.status(400).json({ error: 'Invalid email format' });
//       }

//       const existingEmail = await User.findOne({
//         email: updateFields.email,
//         _id: { $ne: userId },
//       });
//       if (existingEmail) {
//         return res.status(400).json({ error: 'Email is already taken by another user' });
//       }
//     }

//     // Handle phone number update
//     if (updateFields.phoneNumber && updateFields.phoneNumber !== user.phoneNumber) {
//       if (updateFields.phoneNumber.length !== 11) {
//         return res.status(400).json({ error: 'Phone Number must be 11 digits long' });
//       }

//       const existingPhone = await User.findOne({
//         phoneNumber: updateFields.phoneNumber,
//         _id: { $ne: userId },
//       });
//       if (existingPhone) {
//         return res.status(400).json({ error: 'Phone number is already taken by another user' });
//       }
//     }

//     // Handle date of birth
//     if (updateFields.dateOfBirth) {
//       const dobDate = new Date(updateFields.dateOfBirth);
//       if (isNaN(dobDate.getTime())) {
//         return res.status(400).json({ error: 'Invalid date of birth format' });
//       }
//       if (dobDate > new Date()) {
//         return res.status(400).json({ error: 'Date of birth cannot be in the future' });
//       }
//     }

//     // Validate gender
//     if (updateFields.gender && !['Male', 'Female', 'Other'].includes(updateFields.gender)) {
//       return res.status(400).json({ error: 'Gender must be Male, Female, or Other' });
//     }

//     // Validate blood group
//     if (updateFields.bloodGroup) {
//       const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
//       if (!validBloodGroups.includes(updateFields.bloodGroup)) {
//         return res.status(400).json({ error: 'Invalid blood group' });
//       }
//     }

//     // Validate height and weight
//     if (updateFields.height_CM && (updateFields.height_CM < 0 || updateFields.height_CM > 300)) {
//       return res.status(400).json({ error: 'Height must be between 0 and 300 cm' });
//     }
//     if (updateFields.weight_KG && (updateFields.weight_KG < 0 || updateFields.weight_KG > 1000)) {
//       return res.status(400).json({ error: 'Weight must be between 0 and 1000 kg' });
//     }

//     // Validate emergency contact phone number
//     if (
//       updateFields.emergencyContactPhoneNumber &&
//       updateFields.emergencyContactPhoneNumber.length !== 11
//     ) {
//       return res.status(400).json({ error: 'Emergency contact phone number must be 11 digits long' });
//     }

//     // Validate hospital ID for doctors
//     if (updateFields.hospitalId && user.type === 'Doctor') {
//       if (!mongoose.Types.ObjectId.isValid(updateFields.hospitalId)) {
//         return res.status(400).json({ error: 'Invalid hospital ID format' });
//       }
//       const hospital = await User.findById(updateFields.hospitalId);
//       if (!hospital || hospital.type !== 'Hospital') {
//         return res.status(400).json({ error: 'Invalid hospital ID. Must belong to an existing hospital' });
//       }
//     }

//     // Handle document upload (only for Hospital type)
//     if (req.file && user.type === 'Hospital') {
//       updateFields.document = req.file.path; // Store file path
//     } else if (req.file && user.type !== 'Hospital') {
//       return res.status(400).json({ error: 'Document upload is only allowed for Hospital users' });
//     }

//     // Save the updated user
//     user = await user.save();

//     // Remove sensitive fields from response
//     const userResponse = user.toObject();
//     delete userResponse.password;
//     delete userResponse.passwordResetToken;
//     delete userResponse.emailVerificationToken;

//     return res.status(200).json({
//       message: 'Profile updated successfully',
//       user: userResponse,
//     });
//   } catch (error) {
//     console.log('Error in updateUserProfile: ', error.message);
//     if (error.message === 'Only audio, image, .csv, and .xlsx files are allowed') {
//       return res.status(400).json({ error: error.message });
//     }
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };

const updateUserProfile = async (req, res) => {
  const userId = req.user._id; 
  const { currentPassword, newPassword, ...updateFields } = req.body;

  try {
    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

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

    if (updateFields.hospitalId && user.type === 'Doctor') {
      if (!mongoose.isValidObjectId(updateFields.hospitalId)) {
        return res.status(400).json({ error: 'Invalid hospital ID format' });
      }
      const hospital = await User.findById(updateFields.hospitalId);
      if (!hospital || hospital.type !== 'Hospital') {
        return res.status(400).json({ error: 'Invalid hospital ID. Must belong to an existing hospital' });
      }
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

    if (updateFields.specialties) {
      if (!Array.isArray(updateFields.specialties)) {
        updateFields.specialties = [updateFields.specialties];
      }
      if (updateFields.specialties.some((spec) => typeof spec !== 'string')) {
        return res.status(400).json({ error: 'Specialties must be an array of strings' });
      }
    }

    if (updateFields.schedule) {
      if (!Array.isArray(updateFields.schedule)) {
        return res.status(400).json({ error: 'Schedule must be an array' });
      }
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const entry of updateFields.schedule) {
        if (!entry.day || !validDays.includes(entry.day.toLowerCase())) {
          return res.status(400).json({ error: `Schedule day must be one of: ${validDays.join(', ')}` });
        }
        if (!entry.openTime || !entry.closeTime) {
          return res.status(400).json({ error: 'Schedule entry must include openTime and closeTime' });
        }
      }
    }

    if (updateFields.availability) {
      if (!Array.isArray(updateFields.availability)) {
        return res.status(400).json({ error: 'Availability must be an array' });
      }
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const entry of updateFields.availability) {
        if (!entry.day || !validDays.includes(entry.day.toLowerCase())) {
          return res.status(400).json({ error: `Availability day must be one of: ${validDays.join(', ')}` });
        }
        if (!entry.startTime || !entry.endTime) {
          return res.status(400).json({ error: 'Availability entry must include startTime and endTime' });
        }
      }
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

    if (req.file && user.type === 'Hospital') {
      updateFields.document = req.file.path; // Store file path
    } else if (req.file && user.type !== 'Hospital') {
      return res.status(400).json({ error: 'Document upload is only allowed for Hospital users' });
    }

    // Log for debugging
    console.log('Received updateFields:', updateFields);

    // Update the user document
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password -passwordResetToken -emailVerificationToken');

    if (!updatedUser) {
      return res.status(400).json({ message: 'User not found' });
    }

    console.log('Updated user:', updatedUser);

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.log('Error in updateUserProfile:', error.message);
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
