var express = require('express');
const session = require('express-session');

var mysql = require('mysql');
var router = express.Router();

const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const bodyParser = require('body-parser');
const API = require('./crud_mysql');  

var auth = require('./auth');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(session({
  secret: auth._SECRET_,
  resave: false,
  saveUninitialized: true
}));

const CLIENT_ID = auth.auth()['google'].clientid;
const CLIENT_SECRET = auth.auth()['google'].secret;
const REDIRECT_URI = auth.auth()['google'].callback;


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
        usr_role: req.body.usr_role, 
        usr_agent:req.session.user.agent, 
        kodsekolah: req.body.kodsekolah, 
        namasekolah: req.body.namasekolah, 
        alamat1: req.body.alamat1, 
        alamat2: req.body.alamat2, 
        poskod: req.body.poskod, 
        bandar: req.body.bandar, 
        negeri: req.body.negeri
      }
      API.user.register(data, (result) => {
        //res.send(result);
        if(result.registered) 
          res.redirect('/user-peserta-daftar');
      });
    },
    register1: (req, res, next) => {
      res.redirect('/user-panel');
    }
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
      API.program.list((result)=>{
        res.send(result)
      });
    }
  }
}


router.get('/api/sekolah', action.sekolah);
router.post('/api/sekolah/search', action.search);
router.post('/api/user/register', action.user.register);
router.get('/api/user/register-123', action.user.register1);
router.post('/api/peserta/add', action.peserta.insertOrUpdate);
router.post('/api/peserta/count', action.peserta.count);
router.post('/api/peserta/load', action.peserta.load);
router.get('/api/program/list', action.program.list);
router.post('/api/program/list', action.program.list);

module.exports = router;