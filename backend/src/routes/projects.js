const express = require('express');
const { body, param, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const projectValidation = [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').optional().trim(),
  body('systemPrompt').optional().trim()
];

/**
 * @route   GET /api/projects
 * @desc    Get all projects for current user
 * @access  Private
 */
router.get('/', async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true, files: true }
        }
      }
    });

    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/projects
 * @desc    Create a new project/agent
 * @access  Private
 */
router.post('/', projectValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { name, description, systemPrompt } = req.body;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        systemPrompt,
        userId: req.user.id
      }
    });

    res.status(201).json({ 
      message: 'Project created successfully',
      project 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/projects/:id
 * @desc    Get a single project with messages
 * @access  Private
 */
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid project ID')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const project = await prisma.project.findFirst({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        files: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/projects/:id
 * @desc    Update a project
 * @access  Private
 */
router.put('/:id', [
  param('id').isUUID().withMessage('Invalid project ID'),
  ...projectValidation
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    // Check ownership
    const existingProject = await prisma.project.findFirst({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { name, description, systemPrompt } = req.body;

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        systemPrompt
      }
    });

    res.json({ 
      message: 'Project updated successfully',
      project 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete a project
 * @access  Private
 */
router.delete('/:id', [
  param('id').isUUID().withMessage('Invalid project ID')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    // Check ownership
    const existingProject = await prisma.project.findFirst({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await prisma.project.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/projects/:id/messages
 * @desc    Get messages for a project
 * @access  Private
 */
router.get('/:id/messages', [
  param('id').isUUID().withMessage('Invalid project ID')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    // Check ownership
    const project = await prisma.project.findFirst({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const messages = await prisma.message.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ messages });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/projects/:id/messages
 * @desc    Clear all messages in a project
 * @access  Private
 */
router.delete('/:id/messages', [
  param('id').isUUID().withMessage('Invalid project ID')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    // Check ownership
    const project = await prisma.project.findFirst({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await prisma.message.deleteMany({
      where: { projectId: req.params.id }
    });

    res.json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


