
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

const hashPassword = async (password) => {
	return await bcrypt.hash(password, SALT_ROUNDS);
};

// Legacy SHA-256 hash function (for comparison only)
const legacyHashPassword = (password) => {
	const hash = crypto.createHash('sha256');
	hash.update(password);
	return hash.digest('hex');
};

const comparePassword = async (password, hashedPassword) => {
	// Check if it's a bcrypt hash (starts with $2b$)
	if (hashedPassword.startsWith('$2b$')) {
		return await bcrypt.compare(password, hashedPassword);
	}
	// Otherwise, assume it's a legacy SHA-256 hash
	else {
		return legacyHashPassword(password) === hashedPassword;
	}
};

export { hashPassword, comparePassword };
export default hashPassword;

