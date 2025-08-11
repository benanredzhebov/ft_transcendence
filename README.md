## to run with Docker

docker-compose up --build

## to run for testing

cd frontend
npm run build

cd backend
npm run dev

--------------------------------------------------------------------------




--------------------------------------------------------------------------


https://127.0.0.1:3000/username-google

client id : 532929311202-76tdduvrs9d0oied5k4ard52r7k8pq5t.apps.googleusercontent.com
client secret":"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"

const JWT_SECRET = process.env.JWT_SECRET || 'hbj2io4@@#!v7946h3&^*2cn9!@09*@B627B^*N39&^847,1';




--------------2FA----------------
how to run
	-frontend folder npm install, npm run build
	-backend npm install npm run build // also maybe the ssl certificates
how it works
	-you log in and in the dashboard under logout is a 2Fa button, then press generate qr code , you scan it with the googleAuth ap, and next time you try to login if the user has set the 2FA a code will be required.
	still need to do the same thing for the google sign in



created new migration
       -add_two_factor_secret_to_credentials_table in the DB

installed speakeasy for the 2FA to generate a  Time-based One-Time Passwords (TOTP)
	-npm install speakeasy qrcode
	-qrcode to generate a qrcode to be scaned by google auth


- created twofa.ts in frontend, added the route in the main.ts
- created to more routes in the backend for the moment untill i clean everything and do some error checking the routes are in the developer routes and one inside the credentials route


