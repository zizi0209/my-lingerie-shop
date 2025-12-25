import multer from 'multer';

// Cấu hình Multer để upload file từ memory
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
