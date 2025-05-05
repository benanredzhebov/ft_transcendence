
    # Stage 1: Build the frontend
FROM node:alpine as frontend-build
WORKDIR /workspace/frontend
COPY ./frontend /workspace/frontend
RUN npm install
RUN npm run build

# Stage 2: Set up the backend
FROM node:alpine

# Install openssl for HTTPS
RUN apk add --no-cache openssl

# Create the same directory structure as locally
WORKDIR /workspace

# Copy the backend directory
COPY ./backend /workspace/backend

# Copy the built frontend files into the correct relative location
COPY --from=frontend-build /workspace/frontend/dist /workspace/frontend/dist

# Set the working directory to the backend
WORKDIR /workspace/backend

# Install backend dependencies
RUN npm install

# Generate HTTPS certificates (if not already present)
RUN mkdir -p /workspace/backend/https_keys && \
    openssl req -nodes -new -x509 \
    -keyout /workspace/backend/https_keys/private-key.pem \
    -out /workspace/backend/https_keys/certificate.pem \
    -days 365 \
    -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"

# Expose the backend port
EXPOSE 3000

# Set the default command to run the backend server
CMD ["npm", "run", "dev"]


#maybe try with already existing certificates