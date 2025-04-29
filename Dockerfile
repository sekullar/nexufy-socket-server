# Node.js için temel imaj
FROM node:16

# Çalışma dizini oluşturuluyor
WORKDIR /app

# package.json ve package-lock.json dosyalarını kopyala ve bağımlılıkları yükle
COPY package.json package-lock.json ./
RUN npm install

# Uygulama dosyalarını kopyala
COPY . .

# Uygulamayı başlat
CMD ["npm", "start"]
