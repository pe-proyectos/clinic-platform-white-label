# Usamos una imagen ligera de Nginx
FROM nginx:alpine

# Copiamos todos los archivos del proyecto al directorio público de Nginx
COPY . /usr/share/nginx/html

# Exponemos el puerto 80 para que Coolify lo detecte
EXPOSE 80

# Iniciamos Nginx
CMD ["nginx", "-g", "daemon off;"]
