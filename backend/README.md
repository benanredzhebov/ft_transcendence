migrated from CommonJS to ESM :

-Use native ES modules throughout (import/export)
-Eliminate require() and module.exports
-Avoid .default.default bugs
-Be compatible with future Node.js standards

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