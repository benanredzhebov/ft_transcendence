
# Build the frontend first
FROM node:alpine as frontend-build
WORKDIR /workspace/frontend
COPY ./frontend /workspace/frontend
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
    -subj "/C=DE/L=Wolfsburg/O=42School/OU=Unit/CN=localhost"

EXPOSE 3000

CMD ["npm", "run", "dev"]