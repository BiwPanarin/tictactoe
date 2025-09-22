# ใช้ Node.js เวอร์ชัน 20
FROM node:20.14.0-alpine

# ตั้งค่า working directory
WORKDIR /usr/src/app

# คัดลอก package.json และ package-lock.json มาติดตั้ง dependencies
COPY package*.json ./
RUN npm install

# คัดลอกไฟล์ทั้งหมด
COPY . .
 
# กำหนด Environment Variables
ENV SERVER_PORT=5454

# เปิดพอร์ตสำหรับ frontend (เช่น 3000)
EXPOSE 5454

# รันแอป Frontend
CMD ["node", "bin/wwwOrigin"]