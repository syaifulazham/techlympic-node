require("dotenv").config();

const auth = function(){
    return {
        techlympic:{
            host: process.env.DB_MYSQL_HOST,
            port: process.env.DB_MYSQL_PORT,
            user: process.env.DB_MYSQL_USER,
            password: process.env.DB_MYSQL_PASS,
            database: process.env.DB_MYSQL_DBAS
        }
    }
}

const _SECRET_ = process.env.APPS_SECRET_KEY;

const _EMAIL_ = {
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
}



module.exports = {auth,_SECRET_,_EMAIL_}