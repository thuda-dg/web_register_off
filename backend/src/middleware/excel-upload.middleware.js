const multer = require('multer');
const path = require('node:path');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2, parts: 4 },
  fileFilter: (_req, file, callback) => {
    if (!['.xlsx', '.xls'].includes(path.extname(file.originalname).toLowerCase())) {
      return callback(Object.assign(new Error('Chỉ nhận file Excel .xlsx hoặc .xls.'), { statusCode: 400 }));
    }
    callback(null, true);
  }
}).single('file');

module.exports = { excelUpload: (req, res, next) => upload(req, res, error => {
  if (!error) return next();
  return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ ok: false, code: 'INVALID_EXCEL_UPLOAD',
    message: error.code === 'LIMIT_FILE_SIZE' ? 'File Excel tối đa 5 MB.' : error.statusCode ? error.message : 'Upload không hợp lệ. Chọn đúng một file Excel và kỳ đăng ký.' });
}) };
