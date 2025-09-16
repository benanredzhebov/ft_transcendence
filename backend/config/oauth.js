// OAuth configuration for different environments
const getOAuthConfig = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const baseUrl = process.env.APP_URL || 'https://localhost:8443';
  
  return {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${baseUrl}/username-google`,
      // Multiple allowed redirect URIs for flexibility
      allowedRedirectUris: [
        `${baseUrl}/username-google`,
        'https://localhost:8443/username-google',
        'https://c2r11s10.42wolfsburg.de:8443/username-google',
        'https://10.11.17.2:8443/username-google'
      ]
    }
  };
};

export default getOAuthConfig;
