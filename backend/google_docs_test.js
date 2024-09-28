const express = require('express');
const fs = require('fs');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = 5001; // Ensure this matches your Google Cloud Console redirect URI

// Paths to your credential files and token
const CREDENTIALS_PATH = './credentials.json';
const TOKEN_PATH = './token.json';

// Global OAuth2 client object
let oAuth2Client;

/**
 * Step 1: Load client secrets from a local file and set up the OAuth2 client.
 */
fs.readFile(CREDENTIALS_PATH, (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  authorize(JSON.parse(content));
});

/**
 * Step 2: Create an OAuth2 client with the given credentials and configure the Express server.
 * @param {Object} credentials The authorization client credentials.
 */
function authorize(credentials) {
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  console.log('OAuth2 client set up. Ready for web-based authorization flow.');

  // Automatically refresh tokens when access token expires
  oAuth2Client.on('tokens', (newTokens) => {
    if (newTokens.refresh_token) {
      console.log('New refresh token acquired:', newTokens.refresh_token);
    }
    // Update the stored tokens
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(oAuth2Client.credentials));
    console.log('Updated token stored to', TOKEN_PATH);
  });

  // Load tokens if available
  try {
    const tokenData = fs.readFileSync(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(tokenData));
    console.log('Existing tokens loaded from', TOKEN_PATH);
  } catch (error) {
    console.log('No stored tokens found. Start with /auth to authenticate.');
  }

  // Start the Express server after OAuth2 is configured
  app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
  });
}

/**
 * Route 1: Start the OAuth 2.0 flow.
 * When the user visits this route, it will redirect them to the Google OAuth consent screen.
 */
app.get('/auth', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents',
    ],
  });
  console.log('Authorize this app by visiting this URL:', authUrl);
  res.redirect(authUrl);
});

/**
 * Route 2: OAuth2 callback route.
 * Google will redirect to this route after the user grants permission.
 * This route will handle the callback by exchanging the authorization code for an access token.
 */
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    res.send('No authorization code received.');
    return;
  }

  try {
    // Exchange the authorization code for tokens
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    console.log('Tokens acquired:', tokens);

    // Store the tokens to disk for future executions
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    console.log('Token stored to', TOKEN_PATH);

    res.send('Google OAuth 2.0 authentication successful!');
  } catch (error) {
    console.error('Error retrieving access token', error);
    res.send('Error during authentication.');
  }
});

/**
 * Route 3: List the first 10 Google Docs in the user’s Drive.
 * This route requires a valid OAuth2 client and will display a list of documents in the browser.
 */
app.get('/listGoogleDocs', async (req, res) => {
  if (!oAuth2Client) {
    res.send('OAuth2 client is not set up.');
    return;
  }

  const drive = google.drive({ version: 'v3', auth: oAuth2Client });

  try {
    const result = await drive.files.list({
      pageSize: 10,
      q: "mimeType='application/vnd.google-apps.document'",
      fields: 'files(id, name)',
    });

    const files = result.data.files;
    if (files.length) {
      res.send(`Google Docs found:<br>${files.map(file => `${file.name} (${file.id})`).join('<br>')}`);
    } else {
      res.send('No Google Docs found.');
    }
  } catch (err) {
    console.log('The API returned an error: ' + err);
    res.send('Error fetching Google Docs.');
  }
});
