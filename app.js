const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('./ssl/key.pem'),
  cert: fs.readFileSync('./ssl/cert.pem')
};

const bodyParser = require('body-parser');
//var cookieParser = require('cookie-parser');

const express = require('express');
const path = require('path');
const session = require('express-session');

var indexRouter = require('./routes/index');

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;

const app = express();

// Set up the EJS view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Set up the public folder
//app.use(express.static('./public'));
console.log('directory name-path: ',path.join(__dirname, 'public'));
app.use(express.static(path.join(__dirname, 'public')));

// Set up the session middleware
/*
const crypto = require('crypto');
var sessionSecret = crypto.randomBytes(32).toString('hex');
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false
}));
*/

// Set up Passport middleware
//app.use(passport.initialize());
//app.use(passport.session());
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use('/', indexRouter);

app.use(bodyParser.urlencoded({
  extended: true
}));

// parse application/json
app.use(bodyParser.json())

// Set up the Google OAuth 2.0 strategy
/*
passport.use(new GoogleStrategy({
  clientID: '825626154228-bi37csi7f3obga4rolikfr6m5jnk3s8h.apps.googleusercontent.com',
  clientSecret: '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',
  callbackURL: '/auth/google/callback',
  scope: ['profile', 'email']
}, (accessToken, refreshToken, profile, done) => {
  // This function is called when the user successfully authenticates
  // with Google. You can store the user's information in your database
  // or session here.
  const email = (profile.emails && profile.emails.length) ? profile.emails[0].value : null;
  console.log('this is my emailll: ', email);
  done(null, profile);
}));
*/

// Set up the Microsof OAuth 2.0 strategy
passport.use(new OIDCStrategy({
  identityMetadata: 'https://login.microsoftonline.com/ba3818ce-673a-4384-99c5-b1c848225b44/.well-known/openid-configuration',
  clientID: 'fe6e3f10-095c-491d-82f8-195051d6d563',
  responseType: 'id_token',
  responseMode: 'form_post',
  redirectUrl: 'https://localhost:3000/auth/microsoft/callback',
  allowHttpForRedirectUrl: true,
  clientSecret: 'IPC8Q~pJThs1AnX-l-VYyEHWgxXDJ61bU3jyvbKy',
  validateIssuer: false,
  passReqToCallback: false,
  realm: 'ba3818ce-673a-4384-99c5-b1c848225b44',
  scope: ['openid', 'profile', 'email']
}, function (iss, sub, profile, accessToken, refreshToken, done) {
  // This function is called after the user is authenticated.
  // You can use the profile object to access user data.
  done(null, profile);
}));

// Set up Passport serialization and deserialization
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Set up the routes
app.get('/', (req, res) => {
  res.render('index', { user: req.user, page: 'utama.ejs' });
});


/*
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/');
  });
*/

  app.get('/auth/microsoft', passport.authenticate('azuread-openidconnect', {
    failureRedirect: '/login'
  }));
  
  app.post('/auth/microsoft/callback', passport.authenticate('azuread-openidconnect', {
    failureRedirect: '/login'
  }), function(req, res) {
    // This function is called after the user is authenticated successfully.
    res.redirect('/');
  });
  

// Start the server
//https.createServer(options, app).listen(443, function() {
//    console.log('Server running on https://localhost:443');
//  });

require("dotenv").config();

app.listen(process.env.APPLICATION_PORT, function() {
  console.log('Server started on port ' + process.env.APPLICATION_PORT);
});
