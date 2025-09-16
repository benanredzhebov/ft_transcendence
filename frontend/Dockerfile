FROM node:alpine

# Accept build arguments for environment variables
ARG VITE_URL
ARG VITE_GOOGLE_CLIENT_ID

# Set environment variables
ENV VITE_URL=${VITE_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Build the frontend
RUN npm run build

# Install a simple HTTP server for serving static files
RUN npm install -g serve

EXPOSE 3000

# Serve the built frontend
CMD ["serve", "-s", "dist", "-l", "3000"]
