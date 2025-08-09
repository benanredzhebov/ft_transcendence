
import crypto from 'crypto';

const hashPassword = (password) => {
	const hash = crypto.createHash('sha256');
	hash.update(password);
	return hash.digest('hex');
}

export default hashPassword;

