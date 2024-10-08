const express = require('express');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = 5001;  // Ensure this matches your redirect URI

// Paths to your credential files and token
const CREDENTIALS_PATH = './credentials.json';
const TOKEN_PATH = './token.json';

// Load client secrets from a local file
let oAuth2Client;

fs.readFile(CREDENTIALS_PATH, (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  authorize(JSON.parse(content));
});

/**
 * Create an OAuth2 client with the given credentials, then start the server.
 * @param {Object} credentials The authorization client credentials.
 */
function authorize(credentials) {
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Start the server only after setting up the OAuth2 client
  app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
  });
}

/**
 * Route to start the OAuth 2.0 flow.
 */
app.get('/auth', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/documents'],
  });
  console.log('Authorize this app by visiting this URL:', authUrl);
  res.redirect(authUrl);
});

/**
 * Route to handle the OAuth 2.0 callback.
 */
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    res.send('No authorization code found in query parameters.');
    return;
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    console.log('Tokens acquired:', tokens);

    // Save the tokens to a file for future executions
    fs.writeFile(TOKEN_PATH, JSON.stringify(tokens), (err) => {
      if (err) return console.error(err);
      console.log('Token stored to', TOKEN_PATH);
    });

    res.send('Google OAuth 2.0 authentication successful!');
  } catch (error) {
    console.error('Error retrieving access token', error);
    res.send('Error during authentication.');
  }
});

/**
 * Test route to list Google Docs.
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
