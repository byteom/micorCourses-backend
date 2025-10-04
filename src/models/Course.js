const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  shortDescription: {
    type: String,
    required: [true, 'Short description is required'],
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  thumbnail: {
    url: String,
    publicId: String
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Programming',
      'Design',
      'Business',
      'Marketing',
      'Photography',
      'Music',
      'Health',
      'Language',
      'Other'
    ]
  },
  level: {
    type: String,
    required: [true, 'Course level is required'],
    enum: ['Beginner', 'Intermediate', 'Advanced']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Duration is required'],
    min: [0, 'Duration cannot be negative'],
    default: 0
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'published', 'rejected', 'pending_review'],
    default: 'draft'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Course statistics
  enrollmentCount: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  // Admin review
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  rejectionReason: String,
  // Course modification tracking
  lastModified: {
    type: Date,
    default: Date.now
  },
  requiresReapproval: {
    type: Boolean,
    default: false
  },
  modificationReason: String,
  // SEO and search
  tags: [{
    type: String,
    trim: true
  }],
  // Course requirements and outcomes
  requirements: [{
    type: String,
    trim: true
  }],
  outcomes: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });
courseSchema.index({ category: 1, level: 1 });
courseSchema.index({ status: 1, isActive: 1 });
courseSchema.index({ creator: 1 });
courseSchema.index({ 'rating.average': -1 });
courseSchema.index({ enrollmentCount: -1 });

// Virtual for lessons
courseSchema.virtual('lessons', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'course',
  options: { sort: { order: 1 } }
});

// Virtual for lesson count
courseSchema.virtual('lessonCount', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'course',
  count: true
});

// Pre-remove middleware to clean up lessons
courseSchema.pre('deleteOne', { document: true, query: false }, async function() {
  await mongoose.model('Lesson').deleteMany({ course: this._id });
});

// Method to calculate total duration from lessons
courseSchema.methods.calculateTotalDuration = async function() {
  const lessons = await mongoose.model('Lesson').find({ course: this._id });
  const totalDuration = lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
  this.duration = totalDuration;
  return totalDuration;
};

// Method to update enrollment count
courseSchema.methods.updateEnrollmentCount = async function() {
  const User = mongoose.model('User');
  const count = await User.countDocuments({
    'enrolledCourses.course': this._id
  });
  this.enrollmentCount = count;
  await this.save();
  return count;
};

module.exports = mongoose.model('Course', courseSchema);