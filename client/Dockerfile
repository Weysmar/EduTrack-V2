# Node 22 LTS (Node 20 reached end-of-life in April 2026)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
# npm ci installs exactly what package-lock.json pins (reproducible builds, faster than npm install)
RUN npm ci --legacy-peer-deps --no-audit --no-fund
COPY . .
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_API_KEY
ENV VITE_GOOGLE_API_KEY=$VITE_GOOGLE_API_KEY
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build
RUN cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs dist/pdf.worker.min.mjs || true

# Production Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
