const crypto = require('crypto');

// FIX: ENCRYPTION_KEY must be a fixed 32-character string set in your .env file.
// If it's missing, we throw immediately at startup — a random key means any data
// encrypted in a previous server session will be permanently unreadable.
if (!process.env.ENCRYPTION_KEY) {
  throw new Error(
    'FATAL: ENCRYPTION_KEY is not set in your .env file.\n' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\').slice(0,32))"\n' +
    'Then add it to .env as: ENCRYPTION_KEY=<your_32_char_key>'
  );
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Validate length — AES-256-CBC requires exactly 32 bytes
if (Buffer.byteLength(ENCRYPTION_KEY, 'utf8') !== 32) {
  throw new Error(
    `FATAL: ENCRYPTION_KEY must be exactly 32 bytes. ` +
    `Current key is ${Buffer.byteLength(ENCRYPTION_KEY, 'utf8')} bytes.`
  );
}

const IV_LENGTH = 16; // AES block size is always 16 bytes

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const textParts = text.split(':');
  if (textParts.length < 2) {
    throw new Error('Invalid encrypted format — expected "iv:encryptedData"');
  }
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
