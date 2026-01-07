import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendContactEmail } from '../services/emailService';
import { z } from 'zod';

const router = express.Router();

// Validation schema
const contactSchema = z.object({
  name: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(100),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().optional(),
  subject: z.string().min(1, 'Vui lòng chọn chủ đề'),
  message: z.string().min(10, 'Tin nhắn phải có ít nhất 10 ký tự').max(5000),
});

/**
 * POST /api/contact
 * Gửi tin nhắn liên hệ
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validated = contactSchema.parse(req.body);
    const { name, email, phone, subject, message } = validated;

    // Lưu vào database
    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone,
        subject,
        message,
        status: 'NEW',
      },
    });

    // Gửi email (không block response nếu email fail)
    try {
      await sendContactEmail({ name, email, phone, subject, message });
    } catch (emailError) {
      console.error('Failed to send contact email:', emailError);
      // Vẫn return success vì đã lưu vào DB
    }

    res.json({
      success: true,
      message: 'Tin nhắn đã được gửi thành công!',
      data: { id: contactMessage.id },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e: z.ZodIssue) => e.message).join(', ');
      res.status(400).json({
        success: false,
        message: messages,
      });
      return;
    }

    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra, vui lòng thử lại sau',
    });
  }
});

export default router;
