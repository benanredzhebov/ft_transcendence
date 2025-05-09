const axios = require('axios');

// exchangeCodeForToken: Exchanges the authorization code for an access token using Google's token endpoint.
// fetchUserInfo: Fetches user profile data using the access token


// The token is an access token issued by Google's OAuth server. ' +
// 'It is a credential that allows your application to securely access ' +
// 'the user's Google account data (e.g., profile, email) on their behalf.
//
async function exchangeCodeForToken(code) {
	const tokenUrl = 'https://oauth2.googleapis.com/token';
	const params = {
		code,
		client_id: '532929311202-76tdduvrs9d0oied5k4ard52r7k8pq5t.apps.googleusercontent.com',
		client_secret: "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",
		redirect_uri: 'https://127.0.0.1:3000/username-google',
		grant_type: 'authorization_code',
	};

	const response = await axios.post(tokenUrl, null, { params });
	return response.data;
}

async function fetchUserInfo(accessToken) {
	const userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
	const response = await axios.get(userInfoUrl, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	return response.data;
}

module.exports = {exchangeCodeForToken, fetchUserInfo}