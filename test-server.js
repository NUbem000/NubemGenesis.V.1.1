const http = require('http');

const port = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>NubemGenesis Test Server</h1><p>Server is running on port ' + port + '</p>');
});

server.listen(port, () => {
  console.log(`Test server running on port ${port}`);
});