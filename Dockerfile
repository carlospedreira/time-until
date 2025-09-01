# Use Node.js Alpine image (ARM64 compatible)
FROM --platform=linux/arm64 node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port 4200
EXPOSE 4200

# Serve the Angular app using ng serve with production configuration
CMD ["npx", "ng", "serve", "--configuration", "production", "--port", "4200", "--host", "0.0.0.0"]