const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { param, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/json',
      'text/markdown',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

/**
 * @route   POST /api/files/:projectId
 * @desc    Upload a file to a project
 * @access  Private
 */
router.post('/:projectId', [
  param('projectId').isUUID().withMessage('Invalid project ID')
], upload.single('file'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { projectId } = req.params;

    // Check project ownership
    const project = await prisma.project.findFirst({
      where: { 
        id: projectId,
        userId: req.user.id 
      }
    });

    if (!project) {
      // Delete uploaded file if project not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Save file record
    const file = await prisma.file.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        projectId
      }
    });

    res.status(201).json({
      message: 'File uploaded successfully',
      file
    });
  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

/**
 * @route   GET /api/files/:projectId
 * @desc    Get all files for a project
 * @access  Private
 */
router.get('/:projectId', [
  param('projectId').isUUID().withMessage('Invalid project ID')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { projectId } = req.params;

    // Check project ownership
    const project = await prisma.project.findFirst({
      where: { 
        id: projectId,
        userId: req.user.id 
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const files = await prisma.file.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ files });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/files/:projectId/:fileId
 * @desc    Delete a file
 * @access  Private
 */
router.delete('/:projectId/:fileId', [
  param('projectId').isUUID().withMessage('Invalid project ID'),
  param('fileId').isUUID().withMessage('Invalid file ID')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { projectId, fileId } = req.params;

    // Check project ownership
    const project = await prisma.project.findFirst({
      where: { 
        id: projectId,
        userId: req.user.id 
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Find file
    const file = await prisma.file.findFirst({
      where: { 
        id: fileId,
        projectId 
      }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete physical file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Delete database record
    await prisma.file.delete({
      where: { id: fileId }
    });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


