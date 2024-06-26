var express = require('express');
const ExcelJS = require('exceljs');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('fontkit'); // Import the fontkit library
const fs = require('fs').promises;
const path = require('path');

const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
//const sessions = require('express-session');
const cookieParser = require('cookie-parser');

const axios = require('axios');

var mysql = require('mysql');
var router = express.Router();

const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const bodyParser = require('body-parser');
const API = require('./crud_mysql'); 

const uuidv4 = require('uuid').v4;
const auth = require('./auth');
const certGuru = require("./cert-guru");

router.use(bodyParser.raw({ type: 'application/pdf' }));

//console.log('auth.auth(): ',auth.auth());
function generateSessionSecret() {
  return uuidv4();//crypto.randomBytes(32).toString('hex');
}

function mysession(sid){
  console.log('SID: ', sid);
  sid = sid?sid:'abc123';

  console.log('SID: ', sid);
  var res = '';
  const regex = /s:(.*?)\./;
  const match = sid.match(regex);

  if (match) {
    res = match[1];
    console.log(sid); // Output: "Hello World"
  } else {
    console.log("No match found.");
  }

  return res;

}

router.use(cookieParser());
router.use(bodyParser.urlencoded({ extended: true }));

/*
router.use(sessions({
  secret: generateSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {

  }
}));
*/

const CLIENT_ID = auth.auth()['google'].clientid;
const CLIENT_SECRET = auth.auth()['google'].secret;
const REDIRECT_URI = auth.auth()['google'].callback;


var EMAIL = {
  send:(email, sbj, msg, fn) => {
      var nodemailer = require('nodemailer');
      var transporter = nodemailer.createTransport(auth._EMAIL_);
    
      var mailOptions = {
        from: auth._EMAIL_.auth.user,
        to: email,
        subject: sbj,
        text: msg
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        try{
          if (error) {
            console.log(error);
            fn({
              status: false,
              msg: 'Error accured! Sorry for the inconvenience'
            });
          } else {
            //console.log('Email sent: ' + info.response);
            fn({
              status: true,
              msg: 'Email sent: ' + info.response
            });
          }
        }catch(err){
          fn({
            status: false,
            msg: 'Error accured! Sorry for the inconvenience: ' + err
          });
        }
      });
    },
    randomString: function (length) {
      var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      var charLength = chars.length;
      var result = '';
      for (var i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * charLength));
      }
      return result;
  },
}

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

//----------------------------------AUTHENTICATION---------------------------------------------
// Define the route that initiates the authentication flow
router.get('/auth/google', (req, res) => {
  const SCOPES = ['openid', 'email', 'profile'];
  const authUrl = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES.join(' ') });
  res.redirect(authUrl);
});

// Define the route that handles the callback from Google
router.get('/auth/google/callback', (req, res) => {
  const code = req.query.code;



  oauth2Client.getToken(code, (err, tokens) => {
    if (err) {
      console.error('Error getting token:', err);
      res.redirect('/login');
    } else {
      oauth2Client.setCredentials(tokens);

      // Use the tokens to make API calls or access user data.
      const peopleApi = google.people({ version: 'v1', auth: oauth2Client });
      peopleApi.people.get({ resourceName: 'people/me', personFields: 'names,emailAddresses,photos' }, (err, data) => {
        if (err) {
          console.error('Error calling People API:', err);
          res.redirect('/login');
        } else {
          // Render the user data in the EJS view
          //res.render('profile', { user: data.data });
          //console.log(data.data);
          var user = {
            displayName: data.data.names[0].displayName,
            email: data.data.emailAddresses[0].value,
            photo: data.data.photos[0].url,
            agent: 'google'
          }
          //req.session.username = data.data.emailAddresses[0].value;
          //req.session.user = user;
          var scr = generateSessionSecret();
          //req.session.secret = scr;
          res.cookie('localId', {user:user});

          console.log('Logged in: ',  data.data.emailAddresses[0].value, ' at ', new Date);
          //console.log('this is me: ',user);
          res.redirect('/user-panel');
          //res.status(200).send(true);
        }
      });
    }
  });
});

router.get('/download-excel', (req, res) => {
  try{
    //var sessionId = mysession(req.cookies['connect.sid']);
    var session = req.cookies['localId'];
    var uid = session.user.email;
    API.peserta.loadPeserta(uid, 'sekolah', results=>{
      // Create a new Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet 1');

      // Add headers with desired styling
      const headers = ['KP', 'Nama', 'Email', 'Darjah/ Tingkatan', 'Bangsa', 'Jantina', 'Tarikh Lahir', 'Program'];
      worksheet.addRow(headers).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };

      // Add data rows
      results.forEach((row, index) => {
        worksheet.addRow(Object.values(row));
        worksheet.getCell(`A${index + 2}`).numFmt = '@'; // Set KP column format to text
      });

      // Generate the Excel file
      workbook.xlsx.writeBuffer().then((data) => {
        res.attachment('Senarai Peserta.xlsx'); // Set the filename for download
        res.send(data);
      });
    });
  }catch(err){
    console.log(err);
    res.render('main.ejs', { user: {}, page: 'utama.ejs' });
  }
  //const sql = 'SELECT kp, nama, email, jantina, umur, darjah_tingkatan, bangsa, program FROM peserta WHERE usr_email = ?';
  //const params = [req.query.email]; // Get the email parameter from the query string

});

router.get('/download-online-user', (req, res) => {
  try{
    //var sessionId = mysession(req.cookies['connect.sid']);
    var session = req.cookies['localId'];
    var uid = session.user.email;
    API.peserta.loadPeserta(uid, 'sekolah', results=>{

      var data = [];
      results.forEach(d=>data.push({
        kp: d.kp,
        nama:d.nama,
        passcode: EMAIL.randomString(6)
      }));

      API.peserta.updatePasswordBulk(uid, data, d=>{
        // Create a new Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sheet 1');

        // Add headers with desired styling
        const headers = ['KP', 'Nama', 'Passcode'];
        worksheet.addRow(headers).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };

        // Add data rows
        data.forEach((row, index) => {
          worksheet.addRow(Object.values(row));
          worksheet.getCell(`A${index + 2}`).numFmt = '@'; // Set KP column format to text
        });

        // Generate the Excel file
        workbook.xlsx.writeBuffer().then((data) => {
          res.attachment('Senarai Pengguna Dalam Talian.xlsx'); // Set the filename for download
          res.send(data);
        });
      });
      /*
      // Create a new Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet 1');

      // Add headers with desired styling
      const headers = ['KP', 'Nama', 'Email', 'Darjah/ Tingkatan', 'Bangsa', 'Jantina', 'Tarikh Lahir', 'Program'];
      worksheet.addRow(headers).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };

      // Add data rows
      results.forEach((row, index) => {
        worksheet.addRow(Object.values(row));
        worksheet.getCell(`A${index + 2}`).numFmt = '@'; // Set KP column format to text
      });

      // Generate the Excel file
      workbook.xlsx.writeBuffer().then((data) => {
        res.attachment('Senarai Peserta.xlsx'); // Set the filename for download
        res.send(data);
      });
      */
    });
  }catch(err){
    console.log(err);
    res.render('main.ejs', { user: {}, page: 'utama.ejs' });
  }
  //const sql = 'SELECT kp, nama, email, jantina, umur, darjah_tingkatan, bangsa, program FROM peserta WHERE usr_email = ?';
  //const params = [req.query.email]; // Get the email parameter from the query string

});

router.get('/download-excel-negeri', (req, res) => {
  try{
    //var sessionId = mysession(req.cookies['connect.sid']);
    var session = req.cookies['localId'];
    var uid = session.user.email;
    API.peserta.loadPesertaNegeriPrint(uid, 'negeri', results=>{
      API.peserta.loadGuruNegeriPrint(uid, guru=>{
        // Create a new Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Peserta');
  
        const columnWidth = [15, 40, 20, 15, 10, 20, 15, 30, 10];
        // Add headers with desired styling
        const headers = ['KP', 'Nama', 'Email', 'Darjah/ Tingkatan', 'Bangsa', 'Jantina', 'Tarikh Lahir', 'Pertandingan', 'Kumpulan'];
        //worksheet.addRow(headers).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        //worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
  
        // Apply background color to columns A to I
        for (let i = 1; i <= 9; i++) {
          const cell = headerRow.getCell(i);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
          worksheet.getColumn(i).width = columnWidth[i - 1];
        }
  
        // Add data rows
        results.forEach((row, index) => {
          worksheet.addRow(Object.values(row));
          worksheet.getCell(`A${index + 2}`).numFmt = '@'; // Set KP column format to text
        });

        //============================ TAB GURU ============================
        const worksheet2 = workbook.addWorksheet('Kumpulan');
        const columnWidth2 = [40, 15, 30, 30, 30];
        // Add headers with desired styling
        const headers2 = ['Pertandingan', 'Kumpulan', 'Nama Kumpulan', 'Email', 'Guru Pengiring'];
        //worksheet.addRow(headers).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        const headerRow2 = worksheet2.addRow(headers2);
        headerRow2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        //worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
  
        // Apply background color to columns A to I
        for (let i = 1; i <= 5; i++) {
          const cell = headerRow2.getCell(i);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
          worksheet2.getColumn(i).width = columnWidth2[i - 1];
        }
  
        // Add data rows
        guru.forEach((row, index) => {
          worksheet2.addRow(Object.values(row));
          worksheet2.getCell(`A${index + 2}`).numFmt = '@'; // Set KP column format to text
        });
  
        // Generate the Excel file
        workbook.xlsx.writeBuffer().then((data) => {
          res.attachment('Senarai Peserta Peringkat Zone.xlsx'); // Set the filename for download
          res.send(data);
        });
      });
    });
  }catch(err){
    console.log(err);
    res.render('main.ejs', { user: {}, page: 'utama.ejs' });
  }
  //const sql = 'SELECT kp, nama, email, jantina, umur, darjah_tingkatan, bangsa, program FROM peserta WHERE usr_email = ?';
  //const params = [req.query.email]; // Get the email parameter from the query string

});

router.get('/', function (req, res) {
  try{
    //var sessionId = mysession(req.cookies['connect.sid']);
    var session = req.cookies['localId'];
    res.render('main.ejs', { user: session.user, page: 'utama.ejs' });

    console.log('---------------->> ',session);
  }catch(err){
    //console.log(err);
    res.render('main.ejs', { user: {}, page: 'utama.ejs' });
  }
  
});

router.get('/utama', function (req, res) {
  try{
    var session = req.cookies['localId'];
    res.render('main.ejs', { user: session.user, page: 'utama.ejs' });
  }catch(err){
    res.render('main.ejs', { user: {}, page: 'utama.ejs' });
  }
  //res.render('main.ejs', { user: req.session.user, page: 'utama.ejs' });
});

router.get('/program', function (req, res) {
  try{
    var session = req.cookies['localId'];
    res.render('main.ejs', { user: session.user, page: 'program.ejs', kumpulan: {groupid: 0} });
  }catch(err){
    res.render('main.ejs', { user: {}, page: 'program.ejs' });
  }
});

router.get('/jadual', function (req, res) {
  try{
    var session = req.cookies['localId'];
    res.render('main.ejs', { user: session.user, page: 'jadual.ejs' });
  }catch(err){
    res.render('main.ejs', { user: {}, page: 'jadual.ejs' });
  }
});

router.get('/login', function (req, res) {
  try{
    var session = req.cookies['localId'];
    res.render('main.ejs', { user: session.user, page: 'login.ejs' });
  }catch(err){
    res.render('main.ejs', { user: {}, page: 'login.ejs' });
  }
  
});

router.get('/daftar', function (req, res) {
  try{
    var session = req.cookies['localId'];
    res.render('main.ejs', { user: session.user, page: 'daftar.ejs', kumpulan: {groupid: 0} });
    
  }catch(err){
    res.render('main.ejs', { user: {}, page: 'daftar.ejs' });
  }
});

router.get('/reset-password', function (req, res) {
  //var session = req.cookies['localId'];
  res.render('main.ejs', { user: {}, page: 'reset-password.ejs', kumpulan: {groupid: 0} });
});

router.get('/user-panel', function (req, res) {
  console.log(':: 1 :: Enter /user-panel');
  try{
    //var sessionId = mysession(req.cookies['connect.sid']);
    //console.log('My sessions: ', sessionId, req.sessionStore.sessions[sessionId]);
    //console.log('--------->>>>',req.sessionStore.sessions[_lid].cookie);
    const session = req.cookies['localId'];
    console.log(':: 2 :: Fetch cookies');
    //console.log('SESION :',session);
    if(session){
      API.user.isExist(session.user.email, (r) => {
        var data_ = { user: session.user, page: 'user-panel.ejs', registered: r.registered, me: r.data, kumpulan: {groupid: 0} }
        console.log(':: 3 :: Passing: ',data_);
        res.render('main.ejs', data_);
      });
    }
  }catch(err){
    console.log('error: ', err);
    res.render('main.ejs', { user: {}, page: 'login.ejs' });
  }
  
});

router.get('/user-peserta-daftar', function (req, res) {
  console.log(':: 1 :: Enter /user-peserta-daftar');
  try{
    var session = req.cookies['localId'];
    console.log(':: 2 :: Fetch cookies');
    API.user.isExist(session.user.email, (r) => {
      var data_ = { user: session.user, page: 'user-peserta-daftar.ejs', registered: r.registered, me: r.data, kumpulan: {groupid: 0} }
      console.log(':: 3 :: Passing: ',data_);
      res.render('main.ejs', data_);
    });
  }catch(err){
    res.render('main.ejs', { user: {}, page: 'login.ejs' });
  }
  
});

router.get('/user-peserta-urus', function (req, res) {
  console.log(':: 1 :: Enter /user-peserta-urus');
  try{
    var session = req.cookies['localId'];
    console.log(':: 2 :: Fetch cookies');
    API.user.isExist(session.user.email, (r) => {
      var data_ = { user: session.user, page: 'user-peserta-urus.ejs', registered: r.registered, me: r.data, kumpulan: {groupid: 0} };
      console.log(':: 3 :: Passing: ',data_);
      res.render('main.ejs', data_);
    });
  }catch(err){
    res.render('main.ejs', { user: {}, page: 'utama.ejs' });
  }
  
});

router.get('/user-peserta-evaluasi', function (req, res) {
  try{
    var session = req.cookies['localId'];
    API.user.isExist(session.user.email, (r) => {
      //API.peserta.getKumpulan(session.user.email, g=>{
      //  res.render('main.ejs', { user: session.user, page: 'user-peserta-evaluasi-2.ejs', registered: r.registered, me: r.data, kumpulan: g });
      //});
      API.kumpulan.list(r.data.kodsekolah, g=>{
        console.log(g);
        res.render('main.ejs', { user: session.user, page: 'user-peserta-evaluasi-2.ejs', registered: r.registered, me: r.data, kumpulan: g });
      });
    });
  }catch(err){
    res.render('main.ejs', { user: {}, page: 'utama.ejs' });
  }
});

router.get('/kumpulan', (req, res, next) => {
  try{
    console.log('I am here....')
    var session = req.cookies['localId'];
    var shaid = req.query.shaid;
    API.user.isExist(session.user.email, (r) => {
      API.kumpulan.isExist(r.data.kodsekolah, shaid.replace('group-edit-',''), (g)=>{
        res.render('main.ejs',{user:session.user, page:'group-edit.ejs', grpid:shaid, registered:r.registered, kumpulan:g})
      });
    });
    
  }catch(err){
    res.render('main.ejs', { user: {}, page: 'utama.ejs' });
  }
});

router.post('/api/group-add-member', function(req, res){
  console.log(':: 1 :: Enter /api/group-add-member');
  API.kumpulan.addMember(req.body, (r)=>{
    res.send(r);
  });
});

router.post('/api/load-members', function(req, res){
  API.kumpulan.loadMembers(req.body.groupid, (r)=>{
    res.send(r);
  });
});

router.post('/api/delete-member', function(req, res){
  API.kumpulan.deleteMember(req.body.groupid, req.body.kp, (r)=>{
    res.send(r);
  });
});

const fs_ = require('fs');
const multer = require('multer');
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      //console.log(req.headers);
      const groupId = req.headers.groupid*1; // Get the group ID from the request body
      const uploadPath = `public/uploads/${groupId}/`; // Define the upload path dynamically

      fs_.mkdir(uploadPath, { recursive: true }, (err) => {
        if (err) {
          console.error('Error creating directory:', err);
        }
        cb(null, uploadPath); // Set the upload path
      });
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname); // Keep the original file name
    }
  })
});

router.post('/api/upload-file', upload.single('file'), (req, res) => {
  const file = req.file; // Uploaded file details
  const session = req.cookies['localId'];
  const groupId = req.body.groupid; // Retrieve the group ID from the request body

  if (!groupId) {
    return res.status(400).json({ error: 'Group ID is missing in the request body' });
  }

  const data_ = {
    groupid: groupId,
    tajuk: file.originalname,
    obj_file: `uploads/${groupId}/${file.originalname}`, // Update the file path to include the dynamically created folder path
    usr_email: session.user.email
  }

  API.kumpulan.uploadPdf(data_, (r) => {
    res.send(r);
  });
});

router.post('/api/load-pdf', function(req, res){
  API.kumpulan.loadPdf(req.body.groupid, (r)=>{
    res.send(r);
  });
});

router.get('/view-file-pdf', (req, res) => {
  const session = req.cookies['localId'];
  console.log('QUERY====>>>>',req.query);
  try{
    API.user.isExist(session.user.email, (r) => {
      const groupid = req.query.groupid;
      const fname = req.query.filename;
      console.log('body===============>',req.body)
      const fdir = `../uploads/${groupid}/${fname}`;
  
      res.render('main.ejs', { user:session.user, filepath: fdir, page: 'pdf-view.ejs', registered: r.registered })
    })
  }catch(e){
    //res.render('main.ejs', { user: {}, page: 'utama.ejs' });
  }
  
});

router.get('/hello', (req, res, next)=>{
  console.log('-------YES-----');
})

router.get('/user-dashboard', function(req, res, next){
  console.log(':: 1 :: Enter /user-dashboard');
  try{
    var session = req.cookies['localId'];
    console.log(':: 2 :: Fetch cookies');
    API.user.isExist(session.user.email, (r) => {
      API.peserta.countPenyertaan(session.user.email, (penyertaan) => {
        var data_ = { user: session.user, page: 'user-peserta-dashboard.ejs', registered: r.registered, me: r.data , count:penyertaan};
        console.log(':: 3 :: Passing: ',data_);
        res.render('main.ejs', data_);
      });
    });
  }catch(err){
    //console.log('/user-dashboard --error', err );
    res.render('main.ejs', { user: {}, page: 'utama.ejs' });
  }
});

const url = 'https://staging.sparkbackend.cerebry.co';
const headers = {
  'Content-Type': 'application/json',
  'jwt-token': auth._CEREBRY_
};

async function requestToken(usrid) {
  // Define the API URL and request data
  const apiUrl = `${url}/api/v11/partner/user/Teacher-${usrid}/token/`;

  try {
    // Make the POST request
    console.log(apiUrl, headers);
    const response = await axios.get(apiUrl, { headers });

    return response.data;
  } catch (error) {
    // Handle any errors that occurred during the request
    console.error('Error calling API:', error.message);
    throw error; // You can choose to throw the error or handle it differently
  }
}

router.get('/user-cerebry', (req, res)=>{
  var session = req.cookies['localId'];

  API.user.isExist(session.user.email, (r) => {
    requestToken(r.data.kodsekolah.trim()).then(data=>{
      console.log('THE TOKEN=========>>>',data.token);
      res.render('main.ejs', { user: session.user,registered: r.registered, page: 'user-cerebry.ejs',token:data.token });
    }).catch(err=>{
      res.render('main.ejs', { user: {}, page: 'utama.ejs' });
    })
  });
});

router.get('/logout', function (req, res, next) {
  /*
  req.logout(function (err) {
    if (err) { return next(err); }
    req.session.destroy(function (err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });
  */
  //req.session.destroy();
  res.clearCookie('localId');
  res.redirect('/');
});

const action = {
  sekolah: (req, res, next) => {
    API.sekolah.first10((result)=>{
      res.send(result)
    });
  },
  search: (req, res, next) =>{
    //console.log(req.body);
    API.sekolah.search(req.body.query, (result) => {
      res.send(result);
    });
  },
  user: {
    register: (req, res, next) => {
      //usr_name, usr_email, usr_role, usr_agent, kodsekolah, namasekolah, alamat1, alamat2, poskod, bandar, negeri
      try{
        var session = req.cookies['localId'];
        var data = {
          usr_name: req.body.usr_name,  //session.user.displayName
          usr_email:session.user.email, 
          notel: req.body.notel,
          usr_role: req.body.usr_role, 
          usr_agent:session.user.agent, 
          kodsekolah: req.body.kodsekolah, 
          namasekolah: req.body.namasekolah,  
          peringkat: req.body.peringkat, 
          alamat1: req.body.alamat1, 
          alamat2: req.body.alamat2, 
          poskod: req.body.poskod, 
          bandar: req.body.bandar, 
          negeri: req.body.negeri
        }
        console.log('register...', data)
        API.user.register(data, (result) => {
          res.send(result);
          //if(result.registered) 
          //  res.redirect('/user-peserta-daftar');
        });
      }catch(err){
        res.render('main.ejs', { user: {}, page: 'utama.ejs' });
      }
    },
    register1: (req, res, next) => {
      res.redirect('/user-panel');
    },
    create:(req, res, next)=>{
      try{
        //console.log('create START', req.body.email);
        var email = req.body.email;
        var pwd = req.body.pw; //EMAIL.randomString(6);
  
        //if(uid=='') return 0;
  
        API.user.isRegistered(email, (m)=>{
          console.log('check if email already exist ', email);
          if(m.register){ // if true -> proceed
            API.user.create(email, pwd, (s)=>{
              console.log('create new account', email);
              if(s.status){
                console.log('New Registration for: ' + email);
                res.send({msg:'Berjaya daftarkan ' + email})
                /*
                var msg_str = `
                  Tahniah, akaun anda telah didaftarkan. Gunakan kata kunci berikut. Anda boleh ubah kata laluan pada panel Profil Pengguna 
                  Kata Laluan: ` + pwd + `
                `;
                var sbj = '[noreply] Pendaftaran akaun Techlympic Malaysia';
                EMAIL.send(email, sbj, msg_str, (em)=>{
                  console.log('sending confirmation email');
                  if(em.status){
                    res.send({msg:'Account created'})
                  }else{
                    res.send({msg:'Account fail to create'})
                  }
                });
                */
              }
            });
          }else{
            res.send({msg:'Email anda telah wujud dalam pangkalan data'});
          }
        })
      }catch(e){
        console.log(e)
      }
    },
    login:(req, res, next)=>{
      try{
        var email = req.body.email;
        var pass = req.body.pass;
  
        API.user.login(email,pass, (data)=>{
          if(data.data.email){
            var user = {
              displayName: data.data.displayName,
              email: data.data.email,
              photo: data.data.photo,
              agent: data.data.agent
            }

            //req.session.username = data.data.email;
            //req.session.user = user;
            var scr = generateSessionSecret();
            //req.session.secret = scr;
            //res.set('Set-Cookie', `session=${scr}`);
            res.cookie('localId', {user:user});

            console.log('Logged in: ',  data.data.email, ' at ', new Date);
            console.log('this is me: ',user);
            res.send({status: true, msg:'logged-in', goto:'./user-panel'});
          }else{
            res.send({status: false, msg:'Email atau kata laluan tidak sepadan...', goto:'./login'});
          }
        });
      }catch(err){
        console.log('We got error here: (user.login) ', err)
        res.send({msg:'error while logging in', goto:'./login'});
      }
    },
    reset:(req, res, next)=>{
      try{
        //console.log('create START', req.body.email);
        var email = req.body.email;
        var pwd = EMAIL.randomString(6);
        API.user.updatePassword(email, pwd, (s)=>{
          console.log('update password for ', email);
          if(s.status){
            var msg_str = `
              Tahniah, kata laluan anda telah di tetapkan semula, berikut adalah kata laluan sementara anda
              Kata Laluan: ` + pwd + `
            `;
            var sbj = '[noreply] Tetapan semula kata kunci Techlympic Malaysia';
            EMAIL.send(email, sbj, msg_str, (em)=>{
              console.log('sending confirmation email');
              if(em.status){
                res.send({msg:'Account created'})
              }else{
                res.send({msg:'Account fail to create'})
              }
            });
          }
        });
      }catch(e){
        console.log(e)
      }
    },
    renew: (req, res, next) =>{
      var currp = req.body.currp;
      var newp = req.body.newp;

      if(newp.length >= 6){
        var session = req.cookies['localId'];
        var email = session.user.email;
        API.user.login(email, currp, (msg)=>{
          if(msg.authorized){
            API.user.updatePassword(email, newp, (data)=>{
              res.send({status:true, msg:'Kata laluan berjaya dikemaskini'});
            })
          }else{
            res.send({status:false, msg:'Kata laluan semasa anda tidak sepadan'})
          }
        });
        
      }

    },
  },
  peserta: {
    addBulk: (req, res, next) => {
      var data_ = [];
      try{
        var session = req.cookies['localId'];
        req.body.peserta.forEach((d)=>{
          data_.push([
            session.user.email,d.kp,d.nama,d.email,d.darjah_tingkatan,d.program
          ])
        });

        API.peserta.addBulk(req,data_, (d)=>{
          res.send(d);
        })
      }catch(err){
        console.log('error: ', err);
      }

    },
    insertOrUpdate: (req, res, next) => {
      try{
        var session = req.cookies['localId'];
        var pesertaList = req.body.peserta;
        pesertaList.forEach(d=>{d.usr_email = session.user.email});
        API.user.isExist(session.user.email, (r) => {
          pesertaList.forEach(d=>{d.kodsekolah = r.data.kodsekolah});
          //console.log('pesertaList: ', pesertaList);
          API.peserta.insertOrUpdate(pesertaList, (d) => {
            res.send(d);
          });
        });
        //API.peserta.insertOrUpdate(pesertaList, (d) => {
        //  res.send(d);
        //})
      }catch(err){
        console.log('error: ', err);
      }
    },
    delete: (req, res, next) => {
      try{
        var session = req.cookies['localId'];
        var kp = req.body.kp;
        var email = session.user.email;
        
        API.peserta.deletePeserta(email, kp, (d) => {
          res.send(d);
        })
      }catch(err){
        console.log('error: ', err);
      }
    },

    addPesertaNegeri: (req, res, next)=>{
      try{
        var session = req.cookies['localId'];
        var pesertaList = req.body.peserta;
        pesertaList.forEach(d=>{d.usr_email = session.user.email});
        console.log('pesertaList: ', pesertaList);

        var kod = pesertaList[0].kodsekolah!==''?pesertaList[0].kodsekolah:pesertaList[0].usr_email;
        var grp = pesertaList[0].kodsekolah!==''?'Guru':'Belia';

        API.peserta.deletePesertaNegeri(grp, kod, ()=>{
          API.peserta.insertOrUpdateNegeri(pesertaList, (result) => {
            res.send({
              msg: result
            });
          })
        });
      }catch(err){
        console.log('Error addPesertaNegeri: ', err);
      }
    },

    getKumpulanNegeri: (req, res, next)=>{
      try{
        var session = req.cookies['localId'];
        usr = session.user.email;
        API.peserta.getKumpulan(usr,(result)=>{
          res.send(result)
        });
      }catch(err){
        console.log('Error getKumpulanNegeri: ', err);
      }
    },

    saveKumpulanNegeri: (req, res, next)=>{
      try{
        var session = req.cookies['localId'];
        var kumpulan = req.body.kumpulan;
        kumpulan.forEach(d=>{d.usr_email = session.user.email});
        console.log('kumpulan: ', kumpulan);
        API.peserta.saveKumpulan(kumpulan, (result)=>{
          res.send(result);
        });
      }catch(err){
        console.log('Error addPesertaNegeri: ', err);
      }
    },

    count: (req, res, next) => {
      var session = req.cookies['localId'];
      usr = session.user.email;
      API.peserta.countPenyertaan(usr,(result)=>{
        res.send(result)
      });
    },

    load: (req, res, next) => {
      var session = req.cookies['localId'];
      usr = session.user.email;
      API.peserta.loadPeserta(usr, req.body.peringkat, (result)=>{
        res.send(result);
      });
    },

    load_negeri: (req, res, next) => {
      var session = req.cookies['localId'];
      usr = session.user.email;
      API.peserta.loadPesertaNegeri(usr, req.body.peringkat, (result)=>{
        res.send(result);
      });
    },

    search: (req, res, next) => {
      var session = req.cookies['localId'];
      usr = session.user.email;
      src = req.body.search;
      API.peserta.searchPeserta(usr, src, (result)=>{
        res.send(result);
      });
    }
  },
  program: {
    list: (req, res, next) => {
      try{
        var session = req.cookies['localId'];
        usr = (session.user==undefined || session==undefined) ? '--none--' :session.user.email;

        console.log('USER_ROLE____>>>>', session.user);
        API.program.list(usr, (result)=>{
          res.send(result)
        });
      }catch(err){
        API.program.list('--none--', (result)=>{
          res.send(result)
        });
      }
    },
    senarai: (req, res) => {
      try{
        var session = req.cookies['localId'];
        API.user.isExist(session.user.email, (r) => {
          API.program.senarai(r.data.peringkat,result=>{
            res.send(result);
          })
        });
      }catch(err){

      }
    }
  },
  kumpulan:{
    create: (req, res)=>{
      var session = req.cookies['localId'];
      var data = req.body;
      API.kumpulan.loadByName(data.namakumpulan, isexists =>{
        if(!isexists){
          API.user.isExist(session.user.email, (r) => {
            var add = {
              negeri: r.data.negeri,
              kodsekolah: r.data.kodsekolah,
              nama_kumpulan: data.namakumpulan,
              program: data.pertandingan,
              pembimbing: '',
              updatedby: session.user.email
            }
            API.kumpulan.create(add, (result)=>{
              res.send({msg: ''});
            })
          });
        }else{
          res.send({msg: `'${data.namakumpulan}' telah digunakan, sila pilih nama yang lain`})
        }
      })
    },
    list: (req, res)=>{
      
    }
  }
}


router.get('/api/sekolah', action.sekolah);
router.post('/api/sekolah/search', action.search);
router.post('/api/user/register', action.user.register); // register with google OAuth
router.post('/api/user/create', action.user.create); // internal registration
router.post('/api/user/reset', action.user.reset); // internal password reset
router.post('/api/user/renew', action.user.renew); // internal password renewal
router.post('/api/user/login', action.user.login); // internal login
router.post('/api/peserta/add', action.peserta.insertOrUpdate);
router.post('/api/peserta/delete', action.peserta.delete);
router.post('/api/peserta/add-negeri', action.peserta.addPesertaNegeri);
router.post('/api/peserta/count', action.peserta.count);
router.post('/api/peserta/load', action.peserta.load);
router.post('/api/peserta/get-kumpulan', action.peserta.getKumpulanNegeri);
router.post('/api/peserta/save-kumpulan', action.peserta.saveKumpulanNegeri);
router.post('/api/peserta/load-negeri', action.peserta.load_negeri);
router.post('/api/peserta/search', action.peserta.search);
router.get('/api/program/list', action.program.list);
router.post('/api/program/list', action.program.list);
router.post('/api/program/senarai', action.program.senarai);

router.post('/api/kumpulan/addkumpulan', action.kumpulan.create);

router.get('/sessions', (req, res) => {
  //res.json(req.sessionStore.sessions);
  var session = req.cookies['localId'];
  API.user.isExist(session.user.email, (r) => {
    console.log('My session |===============> : ', r)
  })
});



router.get('/api/peserta/download-sijil--', async (req, res) => {
  const inputPdfPath = path.join(__dirname, 'templates', 'SIJIL PENYERTAAN.pdf');
  try {
    console.log(inputPdfPath);

    var session = req.cookies['localId'];
    var uid = session.user.email;
    var data = req.body.data;

    //data.programs = data.program.split('|');

    console.log(data);
  
    console.log('start try---->>>>');
    //const inputPdfBuffer = await fs.readFileSync(inputPdfPath);
    const inputPdfBuffer = await fs.readFile(inputPdfPath);
    //console.log('inputPdfBuffer---->>>>',inputPdfBuffer);

    const inputPdfDoc = await PDFDocument.load(inputPdfBuffer);

    // Create a new PDF document to store the merged pages
    const outputPdfDoc = await PDFDocument.create();

    // Define the events to be added to each page
    const events = ['Event 1', 'Event 2', 'Event 3']; // Add more events as needed

    // Iterate over the desired number of copies and merge pages
    const numCopies = 3; // You can change this to the desired number of copies
    //console.log('inputPdfDoc---->>>>',inputPdfDoc);
    // Embed the Helvetica font
    //const font = await outputPdfDoc.embedFont(PDFDocument.Font.Helvetica);
    const font = await outputPdfDoc.embedFont('Helvetica');
    
    inputPdfDoc.getPages().forEach(function (page, pageIndex) {
      // Iterate over the desired number of copies and merge pages
      for (let i = 0; i < numCopies; i++) {
        // Clone the page and add it to the output document
        const clonedPage = outputPdfDoc.addPage([page.getWidth(), page.getHeight()]);
        const { width, height } = clonedPage.getSize();
    
        // Add the event text to the cloned page
        const textSize = 12;
        clonedPage.drawText(events[pageIndex % events.length], {
          x: 50,
          y: height - 50,
          font,
          size: textSize,
        });
    
        // Draw the content of the original page directly
        const { content } = page;
        /* 
        clonedPage.drawPage(page, {
          x: 0,
          y: 0,
          width,
          height,
        });*/
      }
    });

    // Save the merged PDF as a buffer
    const mergedPdfBuffer = outputPdfDoc.save();
    const fname = kodsekolah + '-' + siri;
    const filePath = path.join(folderPath, `${fname}.pdf`);
    await fs.writeFile(filePath, modifiedPdfBytes);

    // Send the merged PDF as a downloadable file
    res.setHeader('Content-Disposition', `attachment; filename=${fname}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(mergedPdfBuffer);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function createSijil(sijil) {
  console.log('this is my sijil',sijil);
  var peringkat_ = sijil.peringkat.split('|');
  const pos = {
    siri: {
        y:800,
        size: 14
    },
    nama: {
        y:550,
        size: 18
    },
    sekolah: {
        y:530,
        size:18
    },
    pertandingan:{
        y:450,
        size: 18
    },
    peringkat1:{
        y:370,
        size: 20
    },
    peringkat2:{
        y:390,
        size: 20
    },
    tempat:{
        y:340,
        size: 18
    },
    tarikh:{
        y:320,
        size: 16
    }
  }
  // Load the PDF file
  const pdfData = await fs.readFile('templates/SIJIL PENYERTAAN v2.pdf');
  const pdfDoc = await PDFDocument.load(pdfData);

  // Create a new page with the same size as the first page
  const firstPage = pdfDoc.getPages()[0];
  const pageWidth = firstPage.getWidth();
  const pageHeight = firstPage.getHeight();
  //const newPage = pdfDoc.addPage([pageWidth, pageHeight]);

  if(sijil.pertandingan==="3.3KB Pemikiran Komputasi (FC-1)"){
    sijil.pertandingan = "3.3KB Pemikiran Komputasi (Tacobot)";
  }

  const pertandingan = sijil.pertandingan.split(" ");
  pertandingan.shift();
  sijil.pertandingan = pertandingan.join(" ");

  // Define the text and font size
  const fontSize = 20;
  const textSiri = "No Siri: " + sijil.siri;
  const textNama = sijil.nama.toUpperCase();
  const textSekolah = sijil.kp.toUpperCase();
  const textPertandingan = sijil.pertandingan.toUpperCase();
  const textPeringkat1 = peringkat_[0].toUpperCase();
  const textPeringkat2 = peringkat_[1].toUpperCase();
  const textTempat = sijil.tempat.toUpperCase();
  const textTarikh = sijil.tarikh.toUpperCase();

  // Register fontkit
  pdfDoc.registerFontkit(fontkit);

  // Embed the Arial font
  const fontBytes = await fs.readFile('RobotoCondensed-Bold.ttf'); // Provide the path to the Arial font file
  const customFont = await pdfDoc.embedFont(fontBytes);

  // Calculate the x position to center the text horizontally
  const textSiriWidth = customFont.widthOfTextAtSize(textSiri, pos.siri.size);
  const textNamaWidth = customFont.widthOfTextAtSize(textNama, pos.nama.size);
  const textSekolahWidth = customFont.widthOfTextAtSize(textSekolah, pos.sekolah.size);
  const textPertandinganWidth = customFont.widthOfTextAtSize(textPertandingan, pos.pertandingan.size);
  const textPeringkat1Width = customFont.widthOfTextAtSize(textPeringkat1, pos.peringkat1.size);
  const textPeringkat2Width = customFont.widthOfTextAtSize(textPeringkat2, pos.peringkat2.size);
  const textTempatWidth = customFont.widthOfTextAtSize(textTempat, pos.tempat.size);
  const textTarikhWidth = customFont.widthOfTextAtSize(textTarikh, pos.tarikh.size);

  const cxSiri = (pageWidth - textSiriWidth - 40);
  const cxNama = (pageWidth - textNamaWidth) / 2;
  const cxSekolah = (pageWidth - textSekolahWidth) / 2;
  const cxPertandingan = (pageWidth - textPertandinganWidth) / 2;
  const cxPeringkat1 = (pageWidth - textPeringkat1Width) / 2;
  const cxPeringkat2 = (pageWidth - textPeringkat2Width) / 2;
  const cxTempat = (pageWidth - textTempatWidth) / 2;
  const cxTarikh = (pageWidth - textTarikhWidth) / 2;
  //const centerY = pageHeight / 2;

  // Add text in the middle of the page with Arial font
  firstPage.drawText(textSiri, {
    x: cxSiri,
    y: pos.siri.y,
    size: pos.siri.size,
    font: customFont, // Set the font to Arial
    color: rgb(0, 0, 0), // Black color
  });

  firstPage.drawText(textNama, {
    x: cxNama,
    y: pos.nama.y,
    size: pos.nama.size,
    font: customFont, // Set the font to Arial
    color: rgb(0.25, 0.4, 0.6), // Black color
  });

  firstPage.drawText(textSekolah, {
    x: cxSekolah,
    y: pos.sekolah.y,
    size: pos.sekolah.size,
    font: customFont, // Set the font to Arial
    color: rgb(0, 0, 0), // Black color
  });

  firstPage.drawText(textPertandingan, {
    x: cxPertandingan,
    y: pos.pertandingan.y,
    size: pos.pertandingan.size,
    font: customFont, // Set the font to Arial
    color: rgb(0, 0, 0), // Black color
  });

  firstPage.drawText(textPeringkat1, {
    x: cxPeringkat1,
    y: pos.peringkat1.y,
    size: pos.peringkat1.size,
    font: customFont, // Set the font to Arial
    color: rgb(0, 0, 0), // Black color
  });

  firstPage.drawText(textPeringkat2, {
    x: cxPeringkat2,
    y: pos.peringkat2.y,
    size: pos.peringkat2.size,
    font: customFont, // Set the font to Arial
    color: rgb(0, 0, 0), // Black color
  });

  firstPage.drawText(textTempat, {
    x: cxTempat,
    y: pos.tempat.y,
    size: pos.tempat.size,
    font: customFont, // Set the font to Arial
    color: rgb(0, 0, 0), // Black color
  });

  firstPage.drawText(textTarikh, {
    x: cxTarikh,
    y: pos.tarikh.y,
    size: pos.tarikh.size,
    font: customFont, // Set the font to Arial
    color: rgb(0, 0, 0), // Black color
  });

  
  const modifiedPdfBytes = await pdfDoc.save();

  // Send the merged PDF as a downloadable file
  //res.setHeader('Content-Disposition', `attachment; filename=${fname}.pdf`);
  //res.setHeader('Content-Type', 'application/pdf');
  //res.send(mergedPdfBuffer);
  
  return modifiedPdfBytes;
}

async function createSijilBatch(dataArray) {
  const mergedPdfBytes = await mergePdfs(dataArray);
  const mergedFilePath = path.join(__dirname, 'merged_sijil.pdf');
  await fs.writeFile(mergedFilePath, mergedPdfBytes);
}

async function mergePdfs(dataArray) {
  try {
    const mergedPdf = await PDFDocument.create();
    console.log('<---dataArray--->', dataArray);
  
    for (const data of dataArray) {
      console.log('<---data--->',data);
      const pdfBytes = await createSijil(data);
      //console.log('<---pdfBytes--->', pdfBytes);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      //console.log('<---pdfDoc Content--->', pdfDoc.toString());// Log high-level structure of pdfDoc (excluding circular references)
      //console.log('pdfDoc.getPages()===>',pdfDoc.getPages());

      //const [pages] = await pdfDoc.copyPages(pdfDoc.getPages(),[0]);
      //console.log('<---pages--->',pages);
      const [page] = await mergedPdf.copyPages(pdfDoc, [0]);
      //pages.forEach((page) => mergedPdf.addPage(page));
      mergedPdf.addPage(page);
    }
    
    const savedPdf = await mergedPdf.save();
    const fname = dataArray[0].kodsekolah + '-' + dataArray[0].siri;
    const folderPath = path.join(`${auth._CERT_}generated/`);
    await fs.mkdir(folderPath, { recursive: true });
  
    const filePath = path.join(folderPath, `${fname}.pdf`);
    console.log('======>filepath: ',path,filePath);
    await fs.writeFile(filePath, savedPdf);
  
    return savedPdf;
  } catch (error) {
      console.error('Error in PDF generation:', error);
      throw error; // Propagate the error
  }
}

router.post('/api/peserta/download-sijil', async (req, res)=>{
  try{
    var session = req.cookies['localId'];
    var uid = session.user.email;
    var data = req.body.data;
    var pesertaid = await API.peserta.getPesertaID(data.kp,uid); 
    //console.log('pesertaid',pesertaid);

    data.programs = data.program.split('|');

    const sijil_ = await API.user.getUser(uid);
    const sijil = [];
    
    data.programs.forEach(d=>{
      sijil.push({
        nama: data.nama,
        sekolah: sijil_.data.namasekolah,
        pertandingan: d,
        peringkat: 'MALAYSIA TECHLYMPICS 2023|',
        tempat: '',
        tarikh: '',
        kp: data.kp.replace(/\D/g, ''),
        kodsekolah: sijil_.data.kodsekolah,
        siri: '2023-' + d.split(' ')[0].replace('.','') + '-' + data.kp.replace(/\D/g, '').slice(-6) + '-' + pesertaid.data.id,
      });
    });

    console.log(sijil);

    const mergedPdfBytes = await mergePdfs(sijil);
    //const mergedPdfBytes = await createSijil(sijil[0]);
    //const pdfDoc = await PDFDocument.load(mergedPdfBytes);
    const fname = sijil[0].kodsekolah + '-' + sijil[0].siri;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fname}.pdf`);
   
    res.send({pdf:`${fname}.pdf`});
    //res.send(pdfDoc);
    //res.send(await mergedPdfBytes.save());  
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


// E-Cert Guru
router.post('/api/guru/download-sijil', async (req, res)=>{
  try{
    var session = req.cookies['localId'];
    var email = session.user.email;
    var guru = req.body.guru;
    var data = await API.user.getUser(email); 

    //data.programs = req.program.split('|');

    //const sijil_ = await API.user.getUser(uid);
    console.log('=====GURU=====',req.body.guru);
    const sijil = [];
    sijil.push({
      nama: guru.nama,
      sekolah: data.data.namasekolah,
      pertandingan: 'JURULATIH',
      peringkat: 'MALAYSIA TECHLYMPICS 2023|',
      tempat: '',
      tarikh: '',
      kp: '',
      kodsekolah: data.data.kodsekolah,
      siri: '2023-G-' + guru.id,
    });
    
    const pdfGuru = await certGuru.mergePdfs(sijil);
    const mergedPdfBytes = pdfGuru.pdf;
    //const mergedPdfBytes = await createSijil(sijil[0]);
    //const pdfDoc = await PDFDocument.load(mergedPdfBytes);
    console.log(sijil[0]);
    //const fname = sijil[0].kodsekolah + '-' + sijil[0].siri;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${pdfGuru.fname}.pdf`);
   
    res.send({pdf:`${pdfGuru.fname}.pdf`}); 
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});



module.exports = router;