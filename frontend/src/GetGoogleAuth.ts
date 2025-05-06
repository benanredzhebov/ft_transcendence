// import * as https from "node:https";
function getGoogleAuth(){

    const rootUrl = 'https//accounts.google.com/o/oauth2/v2/auth'

    const options = {
        redirect_uri: "https://127.0.0.1:3000/username-google",
        client_id : "532929311202-76tdduvrs9d0oied5k4ard52r7k8pq5t.apps.googleusercontent.com",
        acces_type: 'offline',
        response_type: 'code',
        prompt : 'consent',
        scope:[
            
        ]

    }
    const qs = new URLSearchParams(options);

    return `${rootUrl}?${qs.toString()}`
}

export default  getGoogleAuth;