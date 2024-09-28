const express = require('express');
const router = express.Router();

const { google } = require('googleapis');

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
 'http://localhost:5001/oauth2callback'  // Fallback if REDIRECT_URI is not defined
);

console.log(`Using Redirect URI: ${process.env.REDIRECT_URI}`);
// Sample Route: List Google Docs
router.get('/list', async (req, res) => {
  try {
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.document'",
      fields: 'files(id, name, createdTime, webViewLink, thumbnailLink)',
    });
    res.json(response.data.files);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

router.get('/auth', (req, res) => {
    const url = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive'],
    });
    res.redirect(url);
  });
  
  router.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    res.send('Google Drive API Connected! You can now use the API.');
  });
  

module.exports = router;
