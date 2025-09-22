const moment = require('moment-timezone');
const path = require('path');
require("dotenv").config({ path: path.resolve(__dirname, '../.env') })

// 1
const fs = require('fs');
// const winston = require('winston');
const { createLogger, format, transports } = require('winston');
const { LoggingWinston } = require('@google-cloud/logging-winston'); // เพิ่มไลบรารี GCP Logging

// 2
const logDir = './log/login'; //ใช้กับ docker
if ( !fs.existsSync(logDir) ) {
  fs.mkdirSync(logDir);
}

const logStamp = logFSfuncCurrentDate();
const logTimeStamp = logFSfuncCurrentDateTime();

let logFileName

const env = process.env.ENVIR || 'development';

// info = เก็บขาเข้าและออก
// verbose = สำเร็จแต่ละฟังก์ชัน
// debug = รายละเอียดต่างๆของตัวแปรในฟังก์ชัน

// { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }

const LEVEL = Symbol.for('level');

const gcpLevel = {
  silly: "DEFAULT",
  debug: "DEBUG",
  verbose: "INFO",
  info: "INFO",
  http: "NOTICE",
  warn: "WARNING",
  error: "ERROR"
}

function filterOnly(level) {
  return format(function (info) {
    if (info[LEVEL] === level) {
      return info;
    }
  })();
}

function createGCPLoggingTransport() {
  return new LoggingWinston({
    logName: 'tictactoe-login-web',
    labels: {
      service: 'tictactoe-login-web-service', // ชื่อ Service
      environment: env || 'development', // Environment เช่น dev หรือ prod
      // logLevel: level.toUpperCase(), // ระบุ Level
      module: 'tictactoe-login-web', // Module ที่เกี่ยวข้อง
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
      date: moment().format('YYYY-MM-DD'),
      thaiTimestamp: moment().tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss'),
      thaiDate: moment().tz('Asia/Bangkok').format('YYYY-MM-DD')
    },
    // กำหนด Format ที่ปรับแต่งเอง
    format: format.combine(
      format((info) => {
        const levelLowercase = info.level.toLowerCase();
        info.level = info.level.toUpperCase();
        const splat = info[Symbol.for('splat')];
        if (splat && splat.length) {
          info.title = info.message;
          info.text = splat[0];
          info.data = splat[1] !== undefined ? JSON.stringify(splat[1]) : undefined;
          info.space = "";
          for (let a = 0; a < 8 - info.level.length; a++) {
            info.space += " ";
          }
          info.message = `${ `[${info.space}${info.level}]: ${info.text} ${info.data == undefined ? "" : info.data}`}`
        } else if (info.message === "BAR") {
          info.title = info.message;
          info.message = `---------------------------------------------------------------------------------------------------------`;
        }
        return info;
      })(),
      format.json()
    ),
  });
}

function loggerEnvironment() {

  const cloudWatch  = (cloudLevel) => { return {                   // เขียนขึ้น AWS
    level: `${cloudLevel.toLowerCase()}`,
    logGroupName: '/ecs/def_welfare_backend',
    logStreamName: `${logStamp}_[${cloudLevel}].log`,
    shouldCreateLogGroup: false,
    shouldCreateLogStream: true,
    messageFormatter: ({ level, message, additionalInfo }) => `[${level.toUpperCase()}]: ${message}`,
    awsOptions: {
        credentials: {
            accessKeyId: process.env.ACCESS_KEY_ID, // store it in .env file to keep it safe
            secretAccessKey: process.env.SECRET_ACCESS_KEY,
        },
        region: process.env.REGION,
    },
  }}

  const conSole = () => { return {                  // เขียนลง CONSOLE
    level: 'debug',
    format: format.combine(
      format((info) => {
        info.level = info.level.toUpperCase();
        const splat = info[Symbol.for('splat')];
        if (splat && splat.length) {
          info.title = info.message
          info.text = splat[0]
          info.data = splat[1] != undefined ? JSON.stringify(splat[1]) : undefined
          info.space = ""
            for (let a = 0; a < 7 - info.level.length; a++ ) {
              info.space += " "
            }
        }
        else if (info.message == "BAR") {
          info.title = info.message
          info.message = `---------------------------------------------------------------------------------------------------------`
        }
        return info;
      })(),
      format.colorize(),
      format.printf(
        info => `[${logFSfuncCurrentDateTime()}] ${ info.title == "BAR"  ? info.message : `[${info.level}]${info.space}: ${info.text} ${info.data == undefined ? "" : info.data}`}`
      )
    )
  }}

  const development = () => { return {                  // สร้าง LOG ถ้าด้านล่างไม่ได้กำหนดตัวแปรไว้ต่างหาก จะถูก Assign จากที่นี่โดยอัตโนมัติ
    // change level if in dev environment versus production
    level: 'debug',
    format: format.combine(
      format((info) => {
        const levelLowercase = info.level.toLowerCase();
        info.level = info.level.toUpperCase();
        const splat = info[Symbol.for('splat')];
        if (splat && splat.length) {
          logFileName = info.message
          info.title = info.message
          info.text = splat[0]
          info.data = splat[1] != undefined ? JSON.stringify(splat[1]) : undefined
          info.space = ""
          for (let a = 0; a < 7 - info.level.length; a++ ) {
            info.space += " "
          }
        }
        else if (info.message == "BAR") {
          info.title = info.message
          info.message = `---------------------------------------------------------------------------------------------------------`
        }
        return info;
      })(),
      format.timestamp({
        format: logTimeStamp
      }),
      format.printf(
        info => `[${logFSfuncCurrentDateTime()}] ${ info.title == "BAR"  ? info.message : `[${info.level}]${info.space}: ${info.text} ${info.data == undefined ? "" : info.data}`}`
      )
    ),
    transports: [
      new transports.Console(conSole()),
      new (transports.File)({
        level: 'debug',
        filename: path.join(logDir, `${logStamp}_[COMBINE].log`),
      }),
      new (transports.File)({
        level: 'error',
        format: filterOnly('error'),
        filename: path.join(logDir, `${logStamp}_[ERROR].log`),
      })
    ]
  }}

  const uat = () => { return {
    level: 'debug',
    format: format.combine(
      format((info) => {
        const levelLowercase = info.level.toLowerCase();
        info.level = info.level.toUpperCase();
        const splat = info[Symbol.for('splat')];
        if (splat && splat.length) {
          logFileName = info.message
          info.title = info.message
          info.text = splat[0]
          info.data = splat[1] != undefined ? JSON.stringify(splat[1]) : undefined
          info.space = ""
          for (let a = 0; a < 7 - info.level.length; a++ ) {
            info.space += " "
          }
        }
        else if (info.message == "BAR") {
          info.title = info.message
          info.message = `---------------------------------------------------------------------------------------------------------`
        }
        return info;
      })(),
      format.timestamp({
        format: logTimeStamp
      }),
      format.printf(
        info => `[${logFSfuncCurrentDateTime()}] ${ info.title == "BAR"  ? info.message : `[${info.level}]${info.space}: ${info.text} ${info.data == undefined ? "" : info.data}`}`
      )
    ),
    transports: [
      // เพิ่ม GCP Logging Transport
      createGCPLoggingTransport()
    ]
  }}

  const production = () => { return {
    level: 'debug',
    format: format.combine(
      format((info) => {
        const levelLowercase = info.level.toLowerCase();
        info.level = info.level.toUpperCase();
        const splat = info[Symbol.for('splat')];
        if (splat && splat.length) {
          logFileName = info.message
          info.title = info.message
          info.text = splat[0]
          info.data = splat[1] != undefined ? JSON.stringify(splat[1]) : undefined
          info.space = ""
          for (let a = 0; a < 7 - info.level.length; a++ ) {
            info.space += " "
          }
        }
        else if (info.message == "BAR") {
          info.title = info.message
          info.message = `---------------------------------------------------------------------------------------------------------`
        }
        return info;
      })(),
      format.timestamp({
        format: logTimeStamp
      }),
      format.printf(
        info => `[${logFSfuncCurrentDateTime()}] ${ info.title == "BAR"  ? info.message : `[${info.level}]${info.space}: ${info.text} ${info.data == undefined ? "" : info.data}`}`
      )
    ),
    transports: [
      // new transports.Console(conSole()),

      // เพิ่ม GCP Logging Transport
      createGCPLoggingTransport()
      // createGCPLoggingTransport('debug'), // สำหรับ DEBUG
      // createGCPLoggingTransport('info'),  // สำหรับ INFO
      // createGCPLoggingTransport('verbose'),  // สำหรับ VERBOSE
      // createGCPLoggingTransport('warn'),  // สำหรับ WARN
      // createGCPLoggingTransport('error') // สำหรับ ERROR
    ]
  }}

  return env === 'production' ? production() : env === 'uat' ? uat() : development()

  }

function logFSfuncCurrentDateTime() {
  return moment().tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss');
}

function logFSfuncCurrentDate() {
  return moment().tz('Asia/Bangkok').format('YYYY-MM-DD');
}

const loggerLogin = createLogger(loggerEnvironment());

module.exports = loggerLogin;