var express = require('express');
const session = require('express-session');

var mysql = require('mysql');
var router = express.Router();

const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const bodyParser = require('body-parser');
const API = require('./crud_mysql');  

var auth = require('./auth');

//console.log('auth.auth(): ',auth.auth());

router.use(bodyParser.urlencoded({ extended: true }));
router.use(session({
  secret: auth._SECRET_,
  resave: false,
  saveUninitialized: true
}));

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
          req.session.user = user;
          //console.log('this is me: ',user);
          res.redirect('/user-panel');
        }
      });
    }
  });
});



router.get('/', function (req, res) {
  res.render('main.ejs', { user: req.session.user, page: 'utama.ejs' });
});

router.get('/utama', function (req, res) {
  res.render('main.ejs', { user: req.session.user, page: 'utama.ejs' });
});

router.get('/program', function (req, res) {
  res.render('main.ejs', { user: req.session.user, page: 'program.ejs' });
});

router.get('/jadual', function (req, res) {
  res.render('main.ejs', { user: req.session.user, page: 'jadual.ejs' });
});

router.get('/login', function (req, res) {
  res.render('main.ejs', { user: req.session.user, page: 'login.ejs' });
});

router.get('/daftar', function (req, res) {
  res.render('main.ejs', { user: req.session.user, page: 'daftar.ejs' });
});

router.get('/reset-password', function (req, res) {
  res.render('main.ejs', { user: req.session.user, page: 'reset-password.ejs' });
});

router.get('/user-panel', function (req, res) {
  try{
    API.user.isExist(req.session.user.email, (r) => {
      res.render('main.ejs', { user: req.session.user, page: 'user-panel.ejs', registered: r.registered, me: r.data });
    });
  }catch(err){
    //console.log('error: ', err);
    res.render('main.ejs', { user: req.session.user, page: 'utama.ejs' });
  }
  
});

router.get('/user-peserta-daftar', function (req, res) {
  try{
    API.user.isExist(req.session.user.email, (r) => {
      res.render('main.ejs', { user: req.session.user, page: 'user-peserta-daftar.ejs', registered: r.registered, me: r.data });
    });
  }catch(err){
    res.render('main.ejs', { user: req.session.user, page: 'utama.ejs' });
  }
  
});

router.get('/user-peserta-urus', function (req, res) {
  try{
    API.user.isExist(req.session.user.email, (r) => {
      res.render('main.ejs', { user: req.session.user, page: 'user-peserta-urus.ejs', registered: r.registered, me: r.data });
    });
  }catch(err){
    res.render('main.ejs', { user: req.session.user, page: 'utama.ejs' });
  }
  
});

router.get('/user-peserta-evaluasi', function (req, res) {
  try{
    API.user.isExist(req.session.user.email, (r) => {
      res.render('main.ejs', { user: req.session.user, page: 'user-peserta-evaluasi.ejs', registered: r.registered, me: r.data });
    });
  }catch(err){
    res.render('main.ejs', { user: req.session.user, page: 'utama.ejs' });
  }
});

router.get('/user-dashboard', function(req, res, next){
  try{
    API.user.isExist(req.session.user.email, (r) => {
      API.peserta.countPenyertaan(req.session.user.email, (penyertaan) => {
        res.render('main.ejs', { user: req.session.user, page: 'user-peserta-dashboard.ejs', registered: r.registered, me: r.data , count:penyertaan});
      });
    });
  }catch(err){
    //console.log('/user-dashboard --error', err );
    res.render('main.ejs', { user: req.session.user, page: 'utama.ejs' });
  }
})

router.get('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) { return next(err); }
    req.session.destroy(function (err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });
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
      var data = {
        usr_name: req.session.user.displayName, 
        usr_email:req.session.user.email, 
        notel: req.body.notel,
        usr_role: req.body.usr_role, 
        usr_agent:req.session.user.agent, 
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
    },
    register1: (req, res, next) => {
      res.redirect('/user-panel');
    },
    create:(req, res, next)=>{
      try{
        //console.log('create START', req.body.email);
        var email = req.body.email;
        var pwd = EMAIL.randomString(6);
  
        //if(uid=='') return 0;
  
        API.user.isRegistered(email, (m)=>{
          console.log('check if email already exist ', email);
          if(m.register){ // if true -> proceed
            API.user.create(email, pwd, (s)=>{
              console.log('create new account', email);
              if(s.status){
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
            req.session.user = user;
            console.log('this is me: ',user);
            res.send({msg:'logged-in', goto:'./user-panel'});
          }else{
            res.send({msg:'Email atau kata laluan tidak sepadan...', goto:'./login'});
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
  },
  peserta: {
    addBulk: (req, res, next) => {
      var data_ = [];
      try{
        req.body.peserta.forEach((d)=>{
          data_.push([
            req.session.user.email,d.kp,d.nama,d.email,d.darjah_tingkatan,d.program
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
        var pesertaList = req.body.peserta;
        pesertaList.forEach(d=>{d.usr_email = req.session.user.email});
        API.peserta.insertOrUpdate(pesertaList, (d) => {
          res.send(d);
        })
      }catch(err){
        console.log('error: ', err);
      }
    },

    count: (req, res, next) => {
      usr = req.session.user.email;
      API.peserta.countPenyertaan(usr,(result)=>{
        res.send(result)
      });
    },

    load: (req, res, next) => {
      usr = req.session.user.email;
      API.peserta.loadPeserta(usr, req.body.peringkat, (result)=>{
        res.send(result);
      })
    }
  },
  program: {
    list: (req, res, next) => {
      try{
        usr = (req.session.user==undefined || req.session==undefined) ? '--none--' :req.session.user.email;
        API.program.list(usr, (result)=>{
          res.send(result)
        });
      }catch(err){
        API.program.list('--none--', (result)=>{
          res.send(result)
        });
      }
    }
  }
}


router.get('/api/sekolah', action.sekolah);
router.post('/api/sekolah/search', action.search);
router.post('/api/user/register', action.user.register); // register with google OAuth
router.post('/api/user/create', action.user.create); // internal registration
router.post('/api/user/reset', action.user.reset); // internal password reset
router.post('/api/user/login', action.user.login); // internal login
router.post('/api/peserta/add', action.peserta.insertOrUpdate);
router.post('/api/peserta/count', action.peserta.count);
router.post('/api/peserta/load', action.peserta.load);
router.get('/api/program/list', action.program.list);
router.post('/api/program/list', action.program.list);

module.exports = router;