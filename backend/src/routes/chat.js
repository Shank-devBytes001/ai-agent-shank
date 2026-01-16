const express = require('express');
const { body, param, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Call OpenRouter API for chat completion (uses free models)
 */
async function callLLM(messages, systemPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  // Prepare messages with system prompt
  const formattedMessages = [];
  
  if (systemPrompt) {
    formattedMessages.push({
      role: 'system',
      content: systemPrompt
    });
  }

  // Add conversation history
  formattedMessages.push(...messages.map(msg => ({
    role: msg.role,
    content: msg.content
  })));

  console.log('Calling OpenRouter API with model: nvidia/nemotron-nano-9b-v2:free');
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
      'X-Title': 'shank.ai Chatbot'
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-nano-9b-v2:free',
      messages: formattedMessages,
      max_tokens: 1024,
      temperature: 0.7
    })
  });

  const responseText = await response.text();
  console.log('OpenRouter response status:', response.status);
  
  if (!response.ok) {
    console.error('OpenRouter error:', responseText);
    let errorMessage = 'Failed to get response from AI';
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.error?.message || errorMessage;
    } catch (e) {
      errorMessage = responseText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data = JSON.parse(responseText);
  console.log('OpenRouter success, got response');
  return data.choices[0].message.content;
}

/**
 * @route   POST /api/chat/:projectId
 * @desc    Send a message and get AI response
 * @access  Private
 */
router.post('/:projectId', [
  param('projectId').isUUID().withMessage('Invalid project ID'),
  body('message').trim().notEmpty().withMessage('Message is required')
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
    const { message } = req.body;

    // Check project ownership
    const project = await prisma.project.findFirst({
      where: { 
        id: projectId,
        userId: req.user.id 
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50 // Limit context window
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        role: 'user',
        content: message,
        projectId
      }
    });

    // Get AI response
    const conversationHistory = [...project.messages, { role: 'user', content: message }];
    
    let aiResponse;
    try {
      aiResponse = await callLLM(conversationHistory, project.systemPrompt);
    } catch (error) {
      console.error('AI Error:', error);
      // Save error as assistant message
      await prisma.message.create({
        data: {
          role: 'assistant',
          content: 'I apologize, but I encountered an error processing your request. Please try again.',
          projectId
        }
      });
      return res.status(503).json({ 
        error: 'AI service temporarily unavailable',
        details: error.message 
      });
    }

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        role: 'assistant',
        content: aiResponse,
        projectId
      }
    });

    res.json({
      userMessage,
      assistantMessage
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/chat/:projectId/stream
 * @desc    Send a message and get streaming AI response
 * @access  Private
 */
router.post('/:projectId/stream', [
  param('projectId').isUUID().withMessage('Invalid project ID'),
  body('message').trim().notEmpty().withMessage('Message is required')
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
    const { message } = req.body;

    // Check project ownership
    const project = await prisma.project.findFirst({
      where: { 
        id: projectId,
        userId: req.user.id 
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        role: 'user',
        content: message,
        projectId
      }
    });

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send user message event
    res.write(`data: ${JSON.stringify({ type: 'user_message', data: userMessage })}\n\n`);

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      res.write(`data: ${JSON.stringify({ type: 'error', data: 'API key not configured' })}\n\n`);
      res.end();
      return;
    }

    // Prepare messages
    const formattedMessages = [];
    if (project.systemPrompt) {
      formattedMessages.push({ role: 'system', content: project.systemPrompt });
    }
    formattedMessages.push(...project.messages.map(m => ({ role: m.role, content: m.content })));
    formattedMessages.push({ role: 'user', content: message });

    // Stream from OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
        'X-Title': 'shank.ai Chatbot'
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-nano-9b-v2:free',
        messages: formattedMessages,
        max_tokens: 1024,
        temperature: 0.7,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      res.write(`data: ${JSON.stringify({ type: 'error', data: error.error?.message || 'AI error' })}\n\n`);
      res.end();
      return;
    }

    let fullResponse = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              res.write(`data: ${JSON.stringify({ type: 'chunk', data: content })}\n\n`);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        role: 'assistant',
        content: fullResponse,
        projectId
      }
    });

    res.write(`data: ${JSON.stringify({ type: 'done', data: assistantMessage })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
