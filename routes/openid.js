const express = require('express');
const app = express();
var router = express.Router();

// Require the necessary modules and create the OAuth2Client instance
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = '825626154228-bi37csi7f3obga4rolikfr6m5jnk3s8h.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = '/auth/google/callback';


const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

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
      peopleApi.people.get({ resourceName: 'people/me', personFields: 'names,emailAddresses' }, (err, data) => {
        if (err) {
          console.error('Error calling People API:', err);
          res.redirect('/login');
        } else {
          // Render the user data in the EJS view
          res.render('profile', { user: data.data });
        }
      });
    }
  });
});


module.exports = router;