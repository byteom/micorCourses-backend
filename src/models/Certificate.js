const mongoose = require('mongoose');
const crypto = require('crypto');

const certificateSchema = new mongoose.Schema({
  serialHash: {
    type: String,
    required: true,
    unique: true
  },
  learner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  learnerName: {
    type: String,
    required: true
  },
  courseTitle: {
    type: String,
    required: true
  },
  completionDate: {
    type: Date,
    default: Date.now
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Creator of the course
  },
  isValid: {
    type: Boolean,
    default: true
  },
  // Certificate metadata
  totalLessons: {
    type: Number,
    required: true
  },
  courseDuration: {
    type: Number, // in minutes
    required: true
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'Pass'],
    default: 'Pass'
  }
}, {
  timestamps: true
});

// Indexes
certificateSchema.index({ learner: 1, course: 1 }, { unique: true });
certificateSchema.index({ serialHash: 1 });
certificateSchema.index({ completionDate: -1 });

// Pre-save middleware to generate unique serial hash
certificateSchema.pre('save', function(next) {
  if (!this.serialHash) {
    const data = `${this.learner}-${this.course}-${Date.now()}`;
    this.serialHash = crypto.createHash('sha256').update(data).digest('hex').substring(0, 16).toUpperCase();
  }
  next();
});

// Method to verify certificate authenticity
certificateSchema.methods.verify = function() {
  return this.isValid && this.completionDate && this.serialHash;
};

// Static method to generate certificate
certificateSchema.statics.generateCertificate = async function(learner, course) {
  const User = mongoose.model('User');
  const Course = mongoose.model('Course');
  const Lesson = mongoose.model('Lesson');
  
  // Get course details
  const courseDetails = await Course.findById(course).populate('creator', 'name');
  const lessons = await Lesson.find({ course, isActive: true });
  
  // Generate unique serial hash
  const data = `${learner._id}-${course}-${Date.now()}`;
  const serialHash = crypto.createHash('sha256').update(data).digest('hex').substring(0, 16).toUpperCase();
  
  const certificate = new this({
    serialHash: serialHash,
    learner: learner._id,
    course: course,
    learnerName: learner.name,
    courseTitle: courseDetails.title,
    issuedBy: courseDetails.creator._id,
    totalLessons: lessons.length,
    courseDuration: courseDetails.duration
  });
  
  await certificate.save();
  return certificate;
};

module.exports = mongoose.model('Certificate', certificateSchema);