const express = require('express');
const http    = require('http');
const path    = require('path');

const app = express();

app.use(function (req, res, next) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next()
});

const sendFile = filePath => (req, res) => res.sendFile(filePath, {root: path.join(__dirname)});

app.use('/src', express.static('src'));
app.use('/game', express.static('game'));
app.get('/font.bin', sendFile('font.bin'));
app.get('/', sendFile('index.html'));

http.createServer(app).listen(3000);
