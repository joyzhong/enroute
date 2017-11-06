import Yelp from 'yelp';
import bodyParser from 'body-parser';
import express from 'express';
import http from 'http';

const BASE_URL = '/src/client';
const app = express();
const server = http.createServer(app);

// TODO: Get these vars from local files.
const yelpApi = new Yelp({
  consumer_key: 'rHIvh55HjWB1kmvdSHnC3Q',
  consumer_secret: 'nbBxtVcowNmp9GvPDBQ7xaP5yI0',
  token: 'NcbJpShmt0FxCRIYkGMACHKKenq-bkkn',
  token_secret: 'wRdQ4b7N-eRB7K4qREltZ9C-ZeU',
});

app.use(bodyParser.urlencoded({extended : true}));

// Handle POST requests to get a list of top Yelp places
// by search term and (latitude, longitude).
app.post('/yelp', function(request, response) {
  yelpApi.search({
    term: request.body.term,
    ll: request.body.latitude + ',' + request.body.longitude
  }).then(function(data) {
    response.send(data);
  }).catch(function(err) {
    // TODO: Handle error response.
    console.log(err);
  });
});

// Serve `index.html`.
app.use('/', express.static(__dirname + BASE_URL + '/public'));
// Serve CSS and images.
app.use('/styles', express.static(__dirname + BASE_URL + '/app/styles'));
app.use('/images', express.static(__dirname + BASE_URL + '/app/images'));

server.listen(process.env.PORT || 3000);
