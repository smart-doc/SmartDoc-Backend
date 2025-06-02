const mongoose = require("mongoose");

//Enums
const UserRole = {
  Doctor: 'Doctor',
  Hospital: 'Hospital',
  Patient: 'Patient',
  Admin: 'Admin'
};

const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
};

const Gender = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other'
};

const BloodGroup = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O-'
};

const userSchema = new mongoose.Schema({
  // Authentication & Core Identity
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Role' 
  },
  type: {
    type: String,
    enum: ["Admin", "Hospital", "Doctor", "Patient"],
    required: true
  },
  status: {
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  // Basic Personal Information
  firstName: {
    type: String,
    maxlength: 100
  },
  lastName: {
    type: String,
    maxlength: 100
  },
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true,
    maxlength: 20,
  },
  gender: {
    type: String,
    enum: Object.values(Gender),
  },
  
  // Address Information (shared by Hospital and Patient)
  address: {
    type: String,
  },
  city: {
    type: String,
    maxlength: 100
  },
  state: {
    type: String,
    maxlength: 100
  },
  country: {
    type: String,
    maxlength: 100
  },
  postalCode: {
    type: String,
    maxlength: 20
  },
  
  // Doctor-specific fields
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  specialization: {
    type: String,
    maxlength: 100
  },
  bio: {
    type: String
  },
  availability: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    startTime: String,
    endTime: String
  }],
  
  // Hospital-specific fields
  hospitalName: {
    type: String,
    maxlength: 255
  },
  // location: {
  //   type: {
  //     type: String,
  //     enum: ['Point'],
  //     default: 'Point'
  //   },
  //   coordinates: {
  //     type: [Number], // [longitude, latitude]
  //     index: '2dsphere'
  //   }
  // },
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  website: {
    type: String,
    maxlength: 255
  },
  description: {
    type: String
  },
  specialties: [{
    type: String
  }],
  emergencyServices: {
    type: Boolean,
    default: false
  },
  bedCapacity: {
    type: Number,
    min: 0
  },
  accreditation: {
    type: String,
    maxlength: 255
  },
  open24Hours: {
    type: Boolean,
    default: false
  },
  schedule: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    openTime: String,
    closeTime: String
  }],
  
  // Patient-specific fields
  dateOfBirth: {
    type: Date,
  },
  emergencyContactName: {
    type: String,
    maxlength: 200
  },
  emergencyContactPhoneNumber: {
    type: String,
    maxlength: 20
  },
  emergencyContactRelationship: {
    type: String,
    maxlength: 50
  },
  bloodGroup: {
    type: String,
    enum: Object.values(BloodGroup)
  },
  height_CM: {
    type: Number,
    min: 0,
    max: 300
  },
  weight_KG: {
    type: Number,
    min: 0,
    max: 1000
  },
  preferredLanguage: {
    type: String,
    maxlength: 50,
    default: 'English'
  },
  insuranceProvider: {
    type: String,
    maxlength: 100
  },
  insurancePolicyNumber: {
    type: String,
    maxlength: 100
  },
  
  // Security & Session Management
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  emailVerificationToken: {
    type: String
  },
}, {
  timestamps: true, // adds createdAt and updatedAt
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.passwordResetToken;
      delete ret.emailVerificationToken;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Add indexes for better performance
// userSchema.index({ email: 1 });
// userSchema.index({ type: 1 });
// userSchema.index({ phoneNumber: 1 });
// userSchema.index({ registrationNumber: 1 });
// userSchema.index({ hospitalId: 1 });
// userSchema.index({ "location": "2dsphere" });

const User = mongoose.model("User", userSchema);
module.exports = { User, UserRole, UserStatus, Gender, BloodGroup };