var createError = require('http-errors');
var express = require('express');
var path = require('path');
const session = require('express-session');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const rateLimit = require("express-rate-limit");
const xss = require("xss-clean");

var indexRouter = require('./routes/index');

const { Agent, fetch } = require('undici');

const https = require('https');

var app = express();

app.set('trust proxy', 1);

const eightHour = 1000 * 60 * 60 * 8;
const twoHour = 1000 * 60 * 60 * 2;
const fifteenMinute = 1000 * 60 * 15;
const oneMinute = 1000 * 60 * 1;

const sessionOptions = {
  name: process.env.TOKEN_COOKIE_NAME,
  secret: process.env.SESSION_SECRET,
  saveUninitialized: false,
  resave: false,
  rolling: false, 
  cookie: { 
    maxAge: oneMinute, 
    secure: process.env.ENVIR === 'development' ? false : true,
    sameSite: process.env.ENVIR === 'development' ? 'lax' : 'none',
    httpOnly: true
  },
  proxy: true
};

app.use(session(sessionOptions));

app.use((req, res, next) => {
  if (req.path.startsWith('/checkSession')) {
    req.session.touch = () => {}; // ทำให้ session ไม่ต่ออายุ
  }
  next();
});

// view engine setup
app.set('upload', path.join(__dirname, '/upload'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
// app.use(logger(':method :url :status :res[content-length] - :response-time ms'));
app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

require('dotenv').config();

app.use(xss());

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

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

app.use(function (req, res, next) {
  res.redirect('/');
  // next(createError(404));
});

module.exports = app;
