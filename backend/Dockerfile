
# Build the frontend first
FROM node:alpine as frontend-build
WORKDIR /workspace/frontend
COPY ./frontend /workspace/frontend

# Accept build arguments for environment variables
ARG APP_URL
ARG VITE_URL  
ARG VITE_GOOGLE_CLIENT_ID

# Set environment variables during build
ENV VITE_URL=${VITE_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

RUN npm install
RUN npm run build

# BACKEND
FROM node:alpine

RUN apk add --no-cache openssl

WORKDIR /workspace

COPY ./backend /workspace/backend

COPY --from=frontend-build /workspace/frontend/dist /workspace/frontend/dist

WORKDIR /workspace/backend

RUN npm install

RUN mkdir -p /workspace/backend/https_keys && \
    openssl req -nodes -new -x509 \
    -keyout /workspace/backend/https_keys/private-key.pem \
    -out /workspace/backend/https_keys/certificate.pem \
    -days 365 \
    -subj "/C=DE/L=Wolfsburg/O=42School/OU=Unit/CN=c2r11s10.42wolfsburg.de" \
    -addext "subjectAltName=DNS:c2r11s10.42wolfsburg.de,DNS:localhost,IP:127.0.0.1"

EXPOSE 3000

CMD ["npm", "run", "dev"]