 fronteend
    1 npm install typescript --save-dev

    2.npm install
    3.npm run build 
    and nothing more

got to backend
1.first to get the node_modules folder
    npm install
2. Init the https certificates
    mkdir -p https_keys && openssl req -nodes -new -x509 -keyout https_keys/private-key.pem -out https_keys/certificate.pem -days 365

3. type
    npm run dev

4. click the link where is written server running




docker exec -it <frontend-container-id> sh

docker-compose up --build





https://127.0.0.1:3000/username-google

client id : 532929311202-76tdduvrs9d0oied5k4ard52r7k8pq5t.apps.googleusercontent.com
client secret":"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"