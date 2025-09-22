const  express = require('express');
const  router = express.Router();
const  ejs = require('ejs')
const xss = require("xss-clean");
const  url = require("url");
const path = require('path');
const https = require('https');
const { auth, requiresAuth } = require("express-openid-connect");
const bcrypt = require('bcrypt');


const crypto = require("crypto");
const generateNonce = () => crypto.randomBytes(16).toString("base64").replace(/[\n\r]/g, "");

// require("dotenv").config({ path: path.resolve('../.env') })
require('dotenv').config();

// กำหนด logger แต่ละประเภทใน object `loggers`
const loggers = {
  LOGIN: require(path.resolve('./utils/loggerLogin'))
};

function bar(title) {

  const logger = loggers[title];

  if (logger) {
      logger.log(`verbose`, `BAR`)
  } else {
      console.warn(`No logger found for page: ${title}`);
  }

}

function logger(level, title, head, user, text, data) {
  
  const logger = loggers[title];

  if (logger) {
      logger.log(level, title, `[${head}] [${user}] : ${text}`, data);
  } else {
      console.warn(`No logger found for page: ${title}`);
  }

}

function errMessage(title, level, head, connection, error, session, specific) {
  return new Promise((resolve) => {

    const logger = loggers[title];

    const merge = specific ? `[${session}] [${specific}]` : `[${session}]`;

    if (logger) {
      logger.log(level, title, `[${head}] ${merge} : ERR : `, error);
      logger.log(level, title, `[${head}] ${merge} : ERR MESSAGE : `, error.message);
      logger.log(level, title, `[${head}] ${merge} : ERR STACK : `, error.stack);
      if (connection) {
          connection.release();
          logger.log(level, title, `[${head}] ${merge} : ...release connection complete`)
      }
    } 
    else {
      console.warn(`No logger found for page: ${title}`);
    }

    if (error.reason) {
      resolve(error)
    }
    else {
      resolve({
          "message": "Something Wrong, Please try again later or contact the Support.",
          "reason": "something_wrong",
          "flag": "N"
      })
    }
  })
}


// router.use(xss());

const rateLimit = require("express-rate-limit");

// กำหนด rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 25, // จำกัด 25 requests ต่อ IP
  message: "Too many requests from this IP, please try again laters.",
  standardHeaders: true, // เพิ่มข้อมูลใน headers (RFC standard)
  legacyHeaders: false, // ปิด headers เก่า
  handler: function (req, res) {
      // กรณี rate limiting
      return res.status(429).json({
          status: 429,
          message: "Too many requests from this IP, please try again later.",
          reason: "rate_limiting",
          flag: "N"
      });
  }
});

const {
  AUTH0_ISSUER_BASE_URL,
  AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET,
  AUTH0_BASE_URL,
  SESSION_SECRET,
  PORT_FRONTEND : PORT,
} = process.env;

// เปิด auth แต่ปิด route /login เอง เพื่อทำปุ่ม login ต่อ provider เฉพาะได้
router.use(
  auth({
    issuerBaseURL: AUTH0_ISSUER_BASE_URL,
    baseURL: AUTH0_BASE_URL,
    clientID: AUTH0_CLIENT_ID,
    clientSecret: AUTH0_CLIENT_SECRET,
    secret: SESSION_SECRET,
    authRequired: false,
    idpLogout: true,
    routes: {
      login: false, // เราจะทำ /login/google, /login/github เอง
      callback: "/auth/callback",        // ← กำหนดชัด ๆ
    },
    // ขยาย scope ถ้าต้องการข้อมูลเพิ่ม เช่น email/ profile
    authorizationParams: {
      response_type: 'code',
      scope: 'openid profile email',
    },

    // <<<<<< ตัวสำคัญ: sync ข้อมูลหลัง login >>>>>>
    async afterCallback(req, res, session) {
      // session.user เป็น profile จาก IdP (OIDC claims)
      const { user } = session || req.oidc?.user || {};
      console.log("user > ", user)
      console.log("session > ", session)
      console.log("oidc > ", req.oidc?.user)
      
      // เลือกเก็บเท่าที่จำเป็นเพื่อลดขนาด session
      req.session.user = user ? {
        sub: user.sub,
        name: user.name,
        nickname: user.nickname,
        picture: user.picture,
        email: user.email,
        email_verified: user.email_verified,
      } : null;

      // บันทึก session 
      await new Promise((resolve, reject) => {
        req.session.save(err => err ? reject(err) : resolve());
      });

      return session;
    },
  })
);

const dontCache = (req, res, next) => {
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate'
  );
  res.setHeader('Expires', '0');
  next();
};

// IF YOU WANT HIDE CODE IN SOURCES ADD "layout:false" IN RES.RENDER IN {}
/* GET home page. */
router.get('/', dontCache, function (req, res, next) {
  
  const isAuth = req.oidc.isAuthenticated();
  const user = req.oidc.user;
  if (isAuth || req.session.userName === "TEST USER") {
    res.redirect('/dashboard')
  }
  else if (!isAuth) {
    res.redirect('/signin');
  }
});

const csurf = require('csurf');

// เปิดใช้งาน CSRF Protection โดยเก็บโทเคนไว้ในคุกกี้
const csrfProtection = csurf({ cookie: {
    httpOnly: true,
    sameSite: 'lax',   // ถ้าข้ามโดเมนจริง ๆ ใช้ 'none' + secure:true
    secure: false,     // ใน dev (http) = false, prod(https) = true
  } });
router.use(csrfProtection);

router.get('/getCsrf', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

router.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      "status": 403,
      "message": "Invalid CSRF token",
      "reason": "invalid_csrf_token",
      "flag": "N"
  });
  }
  next(err);
});


// health
router.get('/healthCheck', dontCache, (req, res) => {
  res.sendStatus(200);
})

const createCSPHeader = (scriptNonce, styleNonce) => {
  return [
    "default-src 'none'",
    "connect-src 'self'",
    `script-src 'self' 'nonce-${scriptNonce}' https://ajax.googleapis.com https://cdn.jsdelivr.net https://code.jquery.com`,
    `style-src 'self' 'nonce-${styleNonce}' https://cdn.jsdelivr.net`,
    "img-src 'self' data: https:",
    "font-src 'self' https://cdn.jsdelivr.net"
  ].join("; ");
};

router.get('/signin', function (req, res, next) {
  
  const scriptNonce = generateNonce();
  const styleNonce = generateNonce();

  res.setHeader("Content-Security-Policy", createCSPHeader(scriptNonce, styleNonce));

  res.locals.scriptNonce = scriptNonce;
  res.locals.styleNonce = styleNonce;
  
  const isAuth = req.oidc.isAuthenticated();
  const user = req.oidc.user;

  if (isAuth || req.session.userName == "TEST USER") {
    res.redirect('/dashboard');
  }
  else {
    res.render('login', { title: 'OX TIC-TAC-TOE', 'page': 'login',
      scriptNonce: scriptNonce,
      styleNonce: styleNonce
    });
  }
});

// ชื่อ connection ดูได้จาก Auth0 (เช่น "google-oauth2", "github")
router.get('/login/google', (req, res) => {
  res.oidc.login({
    returnTo: '/dashboard',
    authorizationParams: {
      connection: 'google-oauth2',          // ชื่อ connection ของ Google ใน Auth0
      scope: 'openid profile email',
      // ไม่ต้องใส่ redirect_uri ที่นี่
    },
  });
});

router.get('/login/github', (req, res) => {
  res.oidc.login({
    returnTo: '/dashboard',
    authorizationParams: {
      connection: process.env.AUTH0_GH_CONNECTION || 'github',
      scope: 'openid profile email'
    }
  });
});

// Login with Facebook
router.get("/login/facebook", (req, res) => {
  res.oidc.login({
    returnTo: "/dashboard",  // ← บอกปลายทางหลังล็อกอินให้ชัด
    authorizationParams: {
      connection: "facebook", // ← ชื่อ connection ของ Facebook ใน Auth0
      scope: "openid profile email", // ขอข้อมูลเพิ่ม เช่น email
    },
  });
});


/// ติด EntraId ไม่มีสิทธิ์ในการสร้าง
router.get('/login/microsoft', (req, res) => {
  res.oidc.login({
    returnTo: '/dashboard',
    authorizationParams: {
      connection: process.env.AUTH0_MS_CONNECTION || 'windowslive', // หรือชื่อ enterprise connection ของคุณ
      scope: 'openid profile email',
    },
  });
});

router.get('/tic-tac-toe', dontCache, function (req, res, next) {

  const isAuth = req.oidc.isAuthenticated();
  const user = req.oidc.user;

  if (user) { // req.session.auth
    req.session.language = user.language == "EN" ? user.language : "TH"
    req.session.userId = user.sid;
    req.session.userName = user.name || user.nickname;
    req.session.picture = user.picture;
  }

  if (isAuth || req.session.userName == "TEST USER") {
    return res.render('centrium', { title: 'TIC TAC TOE', 'page': 'ox', userNameSession: req.session.userName })
  }
  else {
    res.redirect('/');
  }
})

router.get('/dashboard', dontCache, function (req, res, next) {

  const isAuth = req.oidc.isAuthenticated();
  const user = req.oidc.user;

  if (user) { // req.session.auth
    req.session.language = user.language == "EN" ? user.language : "TH"
    req.session.userId = user.sid;
    req.session.userName = user.name || user.nickname;
    req.session.picture = user.picture;
  }

  if (isAuth || req.session.userName == "TEST USER") {
    return res.render('centrium', { title: 'DASHBOARD', 'page': 'dashboard' })
  }
  else {
    res.redirect('/');
  }
})

router.get('/report', dontCache, function (req, res, next) {

  const isAuth = req.oidc.isAuthenticated();
  const user = req.oidc.user;

  if (user) { // req.session.auth
    req.session.language = user.language == "EN" ? user.language : "TH"
    req.session.userId = user.sid;
    req.session.userName = user.name || user.nickname;
    req.session.picture = user.picture;
  }

  if (isAuth || req.session.userName == "TEST USER") {
    return res.render('centrium', { title: 'OX REPORT', 'page': 'reportOx', userNameSession: req.session.userName })
  }
  else {
    res.redirect('/');
  }
})

router.get('/checkSession', (req, res) => {
  try {

    const isAuth = req.oidc.isAuthenticated();
    if (isAuth || req.session.userName == "TEST USER") {
      if (isAuth || req.session.userName == "TEST USER") {
        return res.status(200).json({
          status: 200,
          message: "Session Active",
          reason: "session_active",
          flag: "Y",
        });
      } else {
        return res.status(401).json({
          status: 401,
          message: "Session Expired",
          reason: "session_expired",
          flag: "N",
        });
      }
    }
    else {
      throw {
        "status": 500,
        "message": "You are not authorized to access this feature !!",
        "reason": "authorized_failed",
        "flag": "N"
      }
    }
  } catch (err) {
    res.status(err.status || 500).json(err)
  }

});

router.get('/timeout', dontCache, function (req, res, next) {

  req.session.destroy();
  req.session = null
  res.clearCookie(process.env.TOKEN_COOKIE_NAME, { path: '/' });

  const scriptNonce = generateNonce();
  const styleNonce = generateNonce();

  console.log("Script Nonce:", scriptNonce);
  console.log("Style Nonce:", styleNonce);

  res.setHeader("Content-Security-Policy", createCSPHeader(scriptNonce, styleNonce));

  res.locals.scriptNonce = scriptNonce;
  res.locals.styleNonce = styleNonce;

  return res.render('timeout', { title: 'TIMEOUT', 'page': 'timeout',
    scriptNonce: scriptNonce, // ส่ง scriptNonce
    styleNonce: styleNonce    // ส่ง styleNonce 
  })

});

router.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.json({});
});

router.get('/callRank', dontCache, function (req, res, next) {
    // rank : 
    res.json({navUserName : req.session.userName, navUserId : req.session.userId, navUserImage : req.session.picture})
})

router.get('/checkSession', (req, res) => {
  try {
    
    if (req.session.userId) {
      return res.status(200).json({
        status: 200,
        message: "Session Active",
        reason: "session_active",
        flag: "Y",
        // expireTime: req.session.cookie._expires,
        // currentTime: moment().toISOString(),
      });
    } else {
      return res.status(401).json({
        status: 401,
        message: "Session Expired",
        reason: "session_expired",
        flag: "N",
        // expireTime: req.session.cookie._expires,
        // currentTime: moment().toISOString(),
      });
    }
  } catch (err) {
    console.log("Check Session ERROR > ", err);
  }

});

/// LOGIN
router.post('/auth/local', limiter, async (req, res, next) => {

  const started = Date.now();
  const titleSession = "LOGIN"
  const headSession = "TIC TAC TOE LOGIN"
  const userSession = req.body.userId
  
  const sessionlogin = [titleSession, headSession, userSession];

  bar(titleSession)
  logger(`info`, ...sessionlogin, `.....Begin ${headSession}`)

  const dataRequest = {
      userId: req.body.userId,
      password: req.body.password ? "HAVE" : "NOT HAVE",
      appId: process.env.APP_ID,
      language: req.body.language
  }

  logger(`debug`, ...sessionlogin, `DATA REQUEST >>> ` , dataRequest)

  const {
    userId, password, language, honeypot
  } = req.body

  const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!#%&@$])[A-Za-z\d!#%&@$]{8,}$/;

  try {

    if (!userId || userId.length < 3) {
      throw {
        "status": 400,
        "message": "You are not authorized to access this feature !!",
        "reason": "authorized_user_id_failed",
        "flag": "N"
      }
    }

    if (!passwordRegex.test(password) && password != "1234") {
      throw {
          "status": 400,
          "message": "You are not authorized to access this feature !!",
          "reason": "authorized_password_failed",
          "flag": "N"
      }
    }

    if (honeypot) {
      throw {
        "status": 400,
        "message": "You are not authorized to access this feature !!",
        "reason": "authorized_honey_pot_failed",
        "flag": "N"
      }
    }

    const userIdFixedForTest = process.env.USER_ID
    const passwordFixedForTest = process.env.USER_PASSWORD

    if (userId != userIdFixedForTest) {
      throw {
        "status": 401,
        "message": "Username or Password Incorrect",
        "reason": "username_or_password_incorrect",
        "flag": "N"
      };
    }

    console.log(password)
    console.log(passwordFixedForTest)

    const result = await logincontrol(req.body);
    logger(`debug`, ...sessionlogin, `login reult > `, result)

    if (result.status === 200 && result.reason === "login_success") {
      let session;

      session = req.session;
      session.language = "TH";
      session.userId = 'ABC012345';
      session.userName = 'TEST USER';
      session.picture = 'TEST USER';

      logger(`debug`, ...sessionlogin, `session data > `, session)
      logger(`verbose`, ...sessionlogin, `...creating session`)
      req.session.save();
      logger(`verbose`, ...sessionlogin, `...create session complete!!.`)
      logger(`info`, ...sessionlogin, `.....End ${headSession}`)

      res.json(result);

    }
    else {
      throw result
    }

    // เก็บ Audit log เมื่อมี DB
    // await db.insertAuditEvent({
    // tenantId: "OXTEST",
    //   userId: userId || null,
    //   authMethod: "PASSWORD",
    //   action: "AUTH",
    //   resourceType: headSession,
    //   resourceId: `${titleSession}-001`,
    //   endpoint: req.originalUrl,
    //   httpMethod: req.method,
    //   httpStatus: data?.status,
    //   decision: "allow",
    //   status: "SUCCESS",
    //   ip: req.ip, // รองรับ IPv4/IPv6
    //   userAgent: req.get("User-Agent"),
    //   requestId: req.headers["x-request-id"] || null,
    //   latencyMs: Date.now() - started,
    //   dataClass: "INTERNAL",
    //   details: {status: data.status, message: data.message, reason: data.reason, flag:data.flag},
    // });
  } 
  catch (error) {
    /// เก็บ Audit log เมื่อมี DB
    // await db.insertAuditEvent({
    //   tenantId: "OXTEST",
    //   userId: userId || null,
    //   authMethod: "PASSWORD",
    //   action: "AUTH",
    //   resourceType: headSession,
    //   resourceId: `${titleSession}-001`,
    //   endpoint: req.originalUrl,
    //   httpMethod: req.method,
    //   httpStatus: error?.status || 500,
    //   decision: "deny",
    //   status: "FAILED",
    //   ip: req.ip,
    //   userAgent: req.get("User-Agent"),
    //   requestId: req.headers["x-request-id"] || null,
    //   latencyMs: Date.now() - started,
    //   dataClass: "INTERNAL",
    //   details:error,
    // });
    console.log(error)
    res.status(error.status || 500).json(await errMessage(titleSession, `error`, headSession, undefined, error, userSession))
  }

})

async function logincontrol(body) {
  return new Promise(async (resolve, reject) => {
    
    const passwordFixedForTest = process.env.USER_PASSWORD

    bcrypt.compare(body.password, passwordFixedForTest, (err, compareResult) => {
      if (err) { return reject(err) }
      else {
        if (compareResult == true) {
          return resolve({
              "status": 200,
              "message": "Login Success",
              "reason": "login_success",
              "flag": "Y",
              "nextPage": "/dashboard"
          });
        }
        else {
          return reject ({
            "status": 401,
            "message": "Username or Password Incorrect",
            "reason": "username_or_password_incorrect",
            "flag": "N"
          });
        }
      }
    });
  });
}

router.get('/signout', async (req, res) => {

  const returnTo =
    process.env.AUTH0_LOGOUT_RETURN_TO ||
    process.env.AUTH0_BASE_URL || 'http://localhost:5454/';

  console.log('HIT /signout, returnTo =', returnTo);

  const started = Date.now();
  const titleSession = "LOGIN"
  const headSession = "TIC TAC TOE LOGOUT"
  const userSession = req.session.userId
    
  const sessionLogout = [titleSession, headSession, userSession];

  bar(titleSession)
  logger(`info`, ...sessionLogout, `.....Begin ${headSession}`)
  logger(`verbose`, ...sessionLogout, `...destroying session`)
    
  /// เก็บ Audit log เมื่อมี DB
  // await db.insertAuditEvent({
  //   tenantId: "OXTEST",
  //   userId: userSession || null,
  //   authMethod: "SESSION",
  //   action: "AUTH",
  //   resourceType: 'LOGOUT',
  //   resourceId: `LOGOUT-001`,
  //   endpoint: req.originalUrl,
  //   httpMethod: req.method,
  //   httpStatus: 200,
  //   decision: "allow",
  //   status: "SUCCESS",
  //   ip: req.ip,
  //   userAgent: req.get("User-Agent"),
  //   requestId: req.headers["x-request-id"] || null,
  //   latencyMs: Date.now() - started,
  //   dataClass: "INTERNAL",
  //   details: null
  // });

  req.session.destroy(err => {
    if (err) return next(err);

    // ล้าง cookie 
    res.clearCookie('connect.sid', { path: '/' });
    if (process.env.TOKEN_COOKIE_NAME) {
      res.clearCookie(process.env.TOKEN_COOKIE_NAME, { path: '/' });
      logger(`verbose`, ...sessionLogout, `...destroy session complete!!.`)
    }

    // เรียก logout ของ Auth0
    return res.oidc.logout({ returnTo });
    // return res.oidc.logout({ returnTo, logoutParams: { federated: true } });
  });

});

module.exports = router;