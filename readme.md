# TIC TAC TOE TEST PROJECT (Express + Auth0 Social Login)

เดโม่ระบบล็อกอินแบบ **Social (Google / GitHub / Facebook)** ด้วย **Auth0** บน **Express 5**
พร้อมตัวอย่างใช้งาน **express-session**, แสดงรูปโปรไฟล์ (`picture`), หน้า **/tic-tac-toe** แบบ protected,
ฟีเจอร์ด้านความปลอดภัย (Rate limit, CSRF, CSP, SRI) และ (ทางเลือก) **Local Login** ครับ

> README นี้ออกแบบให้รันในเครื่อง (localhost) ก่อน แล้วค่อยปรับสู่ production ภายหลัง

---

## ✨ คุณสมบัติ

* Auth0 + `express-openid-connect` (OIDC)
* Social providers: **Google, GitHub, Facebook** (เปิด/ปิดได้จาก Auth0 Connections)
* ใช้เส้นทาง **`/signout`** ของเราเอง (เลี่ยงชน `/logout` ที่ SDK ผูกไว้) และเคลียร์ `express-session` ให้เรียบร้อย
* เก็บ snapshot ผู้ใช้ที่ต้องใช้ลง **`express-session`** ใน `afterCallback`
* แสดงรูปโปรไฟล์ (`user.picture`) + ตัวอย่างพร็อกซีรูปผ่าน `/avatar`
* (ทางเลือก) **Local Login** ด้วย `bcrypt` + ตัวอย่างโครงสร้าง (รองรับต่อยอดเป็น Prisma/MySQL)
* **Winston logging** สำหรับ activity log (login/logout เป็นตัวอย่าง) ส่งออกได้หลายช่องทาง (ไฟล์, console, AWS CloudWatch, GCP Logs Explorer)
* **Rate limiting** ที่ `/signin`: จำกัด 25 ครั้ง/ไอพี ภายในช่วงเวลาที่กำหนด (ตั้งค่าได้ใน `.env`)
* **CSRF protection** ที่ `/signin` ด้วย `csurf`
* **Content-Security-Policy (CSP)** เฉพาะหน้า login
* **Subresource Integrity (SRI)** ใน `<head>` ของหน้า `/signin`
* **i18n toggle** สลับไทย/อังกฤษ (รองรับทั้งเว็บแอปพลิเคชัน)
* เกม **OX (Tic‑Tac‑Toe)** แบบมีระบบคะแนน + **คอมโบชนะ 3 ครั้งติด** ได้โบนัส และ **Score Board** ดูคะแนนรวม
* **Export Excel** รายงานผลแพ้‑ชนะจากหน้าเกม (ใช้ LocalStorage ในเดโม่; รองรับย้ายไป DB/เซิร์ฟเวอร์ภายหลัง)
* `/healthCheck` สำหรับตรวจสุขภาพเซิร์ฟเวอร์
* **cloudbuild.yaml** + **docker-compose.yml** + **Dockerfile** เบื้องต้นสำหรับ GCP หรือ AWS

---

## 🧱 เทคโนโลยีหลัก

* **Node.js 18+**, **Express 5**
* **Auth0** (`express-openid-connect`)
* **express-session** (รองรับ Store จริง เช่น MySQL/Redis)
* **winston**, (optional) `winston-cloudwatch`, `@google-cloud/logging-winston`
* **csurf**, rate limiter (เช่น `express-rate-limit`)
* **datatable** (สำหรับ export รายงาน)

---

## 🚀 Quick Start (Local)

1. ติดตั้ง dependency

   ```bash
   npm i
   ```
2. คัดลอกไฟล์ env ตัวอย่างแล้วแก้ค่า

3. รันแอป

   ```bash
   npx nodemon
   ```
4. เปิดเบราว์เซอร์ที่ **[http://localhost:5454](http://localhost:5454)** แล้วทดลองปุ่ม Login ต่าง ๆ

---

## ⚙️ ตัวอย่าง `.env`

> ปรับค่าให้ตรงกับเทนแนนต์/โดเมนของคุณ

```env
NODE_ENV=development
ENVIR = 'development'
PORT_FRONTEND=5454
TZ=Asia/Bangkok
TOKEN_COOKIE_NAME=oxTicTacToeSession

# Common
SESSION_SECRET=REPLACE_WITH_SESSION_SECRET

# Auth0 Web (OIDC)
AUTH0_ISSUER_BASE_URL=https://{YOUR_DOMAIN}.auth0.com
AUTH0_CLIENT_ID=REPLACE_WITH_CLIENT_ID
AUTH0_CLIENT_SECRET=REPLACE_WITH_CLIENT_SECRET
AUTH0_BASE_URL=http://localhost:5454
AUTH0_LOGOUT_RETURN_TO=http://localhost:5454/
AUTH0_MS_CONNECTION=windowslive

# FOR LOCAL TEST
USER_ID=user.test
USER_PASSWORD='$2b$12$QJhgExu8r3rkbC.FmDp.K.1ksc06B51c0gbqn4mmJs6UX/fdrNg2a'
```

---

## 🏷️ ตั้งค่า Auth0 (Application)

ไปที่ **Auth0 Dashboard → Applications → (แอปของคุณ) → Settings**

* **Allowed Callback URLs**

  ```
  http://localhost:5454/auth/callback
  ```
* **Allowed Logout URLs**

  ```
  http://localhost:5454/
  ```
* แท็บ **Applications** ของแต่ละ **Connection** → เปิดสวิตช์ให้แอปนี้ (Google/GitHub/Facebook)
* (ถ้าใช้ **Organizations**) ไปเปิด connection เดียวกันใน **Organizations → (org) → Authentication** ด้วย

---

## 🔗 ตั้งค่าแต่ละ Provider

> ทุก provider ต้องชี้ **Redirect/Callback** กลับไปที่ **Auth0** เสมอ จากนั้น Auth0 จะส่งกลับมายังแอปเรา `/auth/callback`

* **Google (Google Cloud Console → OAuth Client)**
  `Authorized redirect URIs` → `https://<YOUR_AUTH0_DOMAIN>/login/callback`
* **GitHub (Developer Settings → OAuth Apps)**
  `Authorization callback URL` → `https://<YOUR_AUTH0_DOMAIN>/login/callback`
* **Facebook (Developers → Facebook Login → Settings)**
  `Valid OAuth Redirect URIs` → `https://<YOUR_AUTH0_DOMAIN>/login/callback`

> เปลี่ยน `<YOUR_AUTH0_DOMAIN>` เป็นโดเมนเทนแนนต์ของคุณ หรือ Custom Domain เช่น `https://auth.example.com`

---

## 🧭 เส้นทางสำคัญ (Routes)

* `GET /` – หน้าเดโม่ สถานะ login + ลิงก์ไปยังผู้ให้บริการ
* `GET /login/google` – ล็อกอิน Google
* `GET /login/github` – ล็อกอิน GitHub
* `GET /login/facebook` – ล็อกอิน Facebook
* `GET /tic-tac-toe` – หน้าเกม (protected)
* `GET /healthCheck` – ตรวจสุขภาพเซิร์ฟเวอร์ (200 OK และข้อมูลเบื้องต้น)
* `POST /signin` – ฟอร์มล็อกอิน (local) ที่มี **Rate Limit + CSRF + CSP + SRI**
* `GET /signout` – **แนะนำใช้** แทน `/logout` ของ SDK

---

## 🔐 ความปลอดภัย & ขีดจำกัด (Security & Limits)

1. **Rate Limit @ /signin**
   จำกัด `RATE_MAX_PER_IP` ครั้ง/ไอพี ใน `RATE_WINDOW_MINUTES` นาที (คืน 429 เมื่อเกิน)
2. **CSRF @ /signin**
   ฟอร์มต้องแนบ token (hidden field/header) และผูกกับ session/cookie
3. **Content-Security-Policy (CSP)** สำหรับหน้า Login:
4. **Subresource Integrity (SRI)** ใส่ `integrity="sha256-..." crossorigin="anonymous"` ให้ asset ภายนอก
5. **Session Timeout** ค่าเริ่มต้น \~8 ชั่วโมง (ปรับได้ด้วย `SESSION_TTL_HOURS`); Social login มี TTL ตาม IdP/Auth0 แยกต่างหาก
6. **Production Cookies** ใช้ `cookie.secure=true`, `cookie.sameSite='none'` และ `app.set('trust proxy', 1)` เมื่ออยู่หลัง HTTPS/proxy
7. **Express 5 vs `xss-clean`**: หลีกเลี่ยง `xss-clean` (ชน read‑only getter ของ `req.query`); เขียน sanitizer ที่ mutate-in-place แทน

---

## 🎮 เกม OX (Tic‑Tac‑Toe) – กติกาคะแนน & Score Board

* คะแนนพื้นฐาน: ชนะบอท +1, แพ้ ‑1, เสมอ 0
* **คอมโบชนะ 3 ครั้งติด**: โบนัสเพิ่ม +1 แล้วรีเซ็ตตัวนับคอมโบ
* **Score Board**: แสดงคะแนนรวมของผู้เล่น (มีตัวกรอง/ค้นหา)
* แหล่งข้อมูลเดโม่: **LocalStorage** (ย้ายไป DB ภายหลังได้)

---

## 📊 Export Excel (ผลแพ้‑ชนะ)

ผู้ใช้สามารถกดปุ่ม Export Excel จากหน้ารายงานเพื่อดาวน์โหลดไฟล์
เดโม่นี้สร้างไฟล์ฝั่งเบราว์เซอร์จาก LocalStorage; ภายหลังสามารถย้ายเป็นดึงจาก DBช

## 🙏 ขอบคุณ

* Auth0 – express-openid-connect
* Google / GitHub / Facebook