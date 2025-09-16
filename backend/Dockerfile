
FROM node:alpine

RUN apk add --no-cache openssl

WORKDIR /workspace

COPY ./backend /workspace/backend

WORKDIR /workspace/backend

RUN npm install

RUN mkdir -p /workspace/backend/https_keys && \
    openssl req -nodes -new -x509 \
    -keyout /workspace/backend/https_keys/private-key.pem \
    -out /workspace/backend/https_keys/certificate.pem \
    -days 365 \
    -subj "/C=DE/L=Wolfsburg/O=42School/OU=Unit/CN=c2r11s10.42wolfsburg.de" \
    -addext "subjectAltName=DNS:c2r11s10.42wolfsburg.de,DNS:localhost,IP:127.0.0.1"

EXPOSE 8443

CMD ["npm", "run", "dev"]