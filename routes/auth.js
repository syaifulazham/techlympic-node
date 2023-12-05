require("dotenv").config();

const auth = function(){
    return {
        techlympic:{
            host: process.env.DB_MYSQL_HOST,
            port: process.env.DB_MYSQL_PORT,
            user: process.env.DB_MYSQL_USER,
            password: process.env.DB_MYSQL_PASS,
            database: process.env.DB_MYSQL_DBAS
        },
        google:{
          clientid: process.env.GOOGLE_CLIENT_ID,
          secret: process.env.GOOGLE_CLIENT_SECRET,
          callback: process.env.GOOGLE_REDIRECT_URI
        }
    }
}

const _CERT_ = process.env.CERT_PATH;

const _SECRET_ = process.env.APPS_SECRET_KEY;

const _CEREBRY_ = process.env.CEREBRY_JWT;

const _EMAIL_ = {
  service: process.env.EMAIL_SERVICE,
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_SMTP_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
}



module.exports = {auth,_SECRET_,_EMAIL_,_CEREBRY_,_CERT_}