// OAuth configuration for different environments
const getOAuthConfig = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  return {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${process.env.APP_URL}/username-google`,
      // Multiple allowed redirect URIs for flexibility
      allowedRedirectUris: [
        `${process.env.APP_URL}/username-google`,
        'https://localhost:8443/username-google',
        'https://10.11.17.2:8443/username-google'
      ]
    }
  };
};

export default getOAuthConfig;
