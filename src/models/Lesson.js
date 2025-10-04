const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Lesson title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  order: {
    type: Number,
    required: [true, 'Lesson order is required'],
    min: [1, 'Order must be at least 1']
  },
  video: {
    url: {
      type: String,
      required: [true, 'Video URL is required']
    },
    publicId: {
      type: String,
      required: true
    },
    duration: {
      type: Number, // in seconds
      default: 0
    }
  },
  thumbnail: {
    url: {
      type: String
    },
    publicId: {
      type: String
    }
  },
  transcript: {
    type: String,
    default: ''
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Lesson resources
  resources: [{
    title: String,
    url: String,
    type: {
      type: String,
      enum: ['pdf', 'link', 'file', 'other']
    }
  }],
  // Lesson notes for instructors
  notes: {
    type: String,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  }
}, {
  timestamps: true
});

// Compound index to ensure unique order per course
lessonSchema.index({ course: 1, order: 1 }, { unique: true });
lessonSchema.index({ course: 1, isActive: 1 });

// Pre-save middleware to validate order uniqueness
lessonSchema.pre('save', async function(next) {
  if (this.isModified('order') || this.isNew) {
    const existingLesson = await this.constructor.findOne({
      course: this.course,
      order: this.order,
      _id: { $ne: this._id }
    });
    
    if (existingLesson) {
      const error = new Error(`Lesson with order ${this.order} already exists in this course`);
      error.name = 'ValidationError';
      return next(error);
    }
  }
  next();
});

// Static method to get next available order for a course
lessonSchema.statics.getNextOrder = async function(courseId) {
  const lastLesson = await this.findOne({ course: courseId })
    .sort({ order: -1 })
    .select('order');
  
  return lastLesson ? lastLesson.order + 1 : 1;
};

// Method to reorder lessons after deletion
lessonSchema.statics.reorderLessons = async function(courseId, deletedOrder) {
  await this.updateMany(
    { course: courseId, order: { $gt: deletedOrder } },
    { $inc: { order: -1 } }
  );
};

// Pre-remove middleware to reorder remaining lessons
lessonSchema.pre('deleteOne', { document: true, query: false }, async function() {
  await this.constructor.reorderLessons(this.course, this.order);
});

module.exports = mongoose.model('Lesson', lessonSchema);