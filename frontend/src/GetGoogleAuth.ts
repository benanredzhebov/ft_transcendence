// import * as https from "node:https";
function getGoogleAuth(){

    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth'

    const options = {
        redirect_uri: `${import.meta.env.VITE_URL}/username-google`,
        client_id : import.meta.env.VITE_GOOGLE_CLIENT_ID || "692342842395-ln6csq22fihcfdi8snc3onrff9t3hqbf.apps.googleusercontent.com",
        access_type: 'offline',
        response_type: 'code',
        prompt : 'consent',
        scope:[
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',

        ].join(" ")

    }
    const qs = new URLSearchParams(options);

    return `${rootUrl}?${qs.toString()}`
}

export default  getGoogleAuth;