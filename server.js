const express = require('express');

const app = express();

app.use(express.static('dist'));

app.get('/', (request, response) => {
  response.sendFile('index.html', { root: __dirname });
});

app.listen(3000, () => {
  console.log();
  console.log('To use Zeitbook, open http://localhost:3000 in your browser.')
  console.log();
});
