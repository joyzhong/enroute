import yelp from 'yelp-fusion';
import bodyParser from 'body-parser';
import express from 'express';
import http from 'http';

const BASE_URL = '/src/client';
const app = express();
const server = http.createServer(app);

// TODO: Get these vars from local files.
const yelpClient = yelp.client(
  's-uDnEUKhDiQmV1QS3YzfvmzSni0Ds_XJQX19HWiAVoccpjR6pdlt1tTMJXq2yN-4U1Da4eVX5Zv8fZGn7rwQDPFPxTlVma5LT3Myk3H9eamNp_d6QbiDWwkZ1I9W3Yx');

app.use(bodyParser.urlencoded({extended : true}));

// Handle POST requests to get a list of top Yelp places
// by search term and (latitude, longitude).
app.post('/yelp', function(request, response) {
  yelpClient.search({
    term: request.body.term,
    latitude: request.body.latitude,
    longitude: request.body.longitude,
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
