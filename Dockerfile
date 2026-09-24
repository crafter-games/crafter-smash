FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html style.css /usr/share/nginx/html/
COPY js /usr/share/nginx/html/js
COPY assets /usr/share/nginx/html/assets
EXPOSE 80
