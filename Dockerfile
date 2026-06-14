# ---- Build stage: compile the Vite/React app to static files ----
FROM node:20-alpine AS build
WORKDIR /app
# .npmrc carries legacy-peer-deps=true (needed by this dependency set)
COPY package.json package-lock.json .npmrc ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# ---- Runtime stage: serve the static build with nginx ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
