const dotenv = require('dotenv');
dotenv.config();
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');

// Configure AWS S3
const hasS3Config = process.env.AWS_ACCESS_KEY_ID && 
                    process.env.AWS_SECRET_ACCESS_KEY && 
                    process.env.AWS_REGION &&
                    process.env.AWS_S3_BUCKET_NAME;

if (!hasS3Config) {
  console.warn(' AWS S3 environment variables are missing!');
  console.warn('File upload features will not work properly.');
  console.warn('Required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET_NAME');
} else {
  console.log(' AWS S3 configured successfully');
}

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

// Upload file to S3
const uploadToS3 = async (file, folder = 'uploads') => {
  const fileName = `${folder}/${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read' // Make files publicly accessible
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    
    // Construct public URL
    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    
    return {
      url: fileUrl,
      key: fileName, // S3 object key (equivalent to Cloudinary's publicId)
      bucket: BUCKET_NAME,
      region: process.env.AWS_REGION
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

// Delete file from S3
const deleteFromS3 = async (key) => {
  if (!key) return;

  const params = {
    Bucket: BUCKET_NAME,
    Key: key
  };

  try {
    await s3Client.send(new DeleteObjectCommand(params));
    console.log(`Successfully deleted ${key} from S3`);
  } catch (error) {
    console.error('S3 delete error:', error);
    // Don't throw error - file might already be deleted
  }
};

// Generate presigned URL for private files (if needed in future)
const getPresignedUrl = async (key, expiresIn = 3600) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key
  };

  try {
    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('S3 presigned URL error:', error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
};

// Multer memory storage for file uploads
const storage = multer.memoryStorage();

// Multer middleware for thumbnails (images)
const uploadThumbnail = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for thumbnails'), false);
    }
  },
});

// Multer middleware for videos
const uploadVideo = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  },
});

// Combined multer for lesson uploads (video + thumbnail)
const uploadLesson = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video and image files are allowed'), false);
    }
  },
});

module.exports = {
  s3Client,
  uploadToS3,
  deleteFromS3,
  getPresignedUrl,
  uploadThumbnail,
  uploadVideo,
  uploadLesson,
};

