import axios from 'axios';

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
		client_id: process.env.GOOGLE_CLIENT_ID,
		client_secret: process.env.GOOGLE_CLIENT_SECRET,
		redirect_uri: `${process.env.APP_URL}/username-google`,
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

export { exchangeCodeForToken, fetchUserInfo };