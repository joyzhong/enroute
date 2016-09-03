import AppBar from 'material-ui/AppBar';
import TextField from 'material-ui/TextField';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';
import React from 'react';
import ReactDOM from 'react-dom';
import Slider from 'material-ui/Slider';
import injectTapEventPlugin from 'react-tap-event-plugin';
 
// Needed for onTouchTap 
// http://stackoverflow.com/a/34015469/988941 
injectTapEventPlugin();

const TEXT_FIELD_START_DEST = 'startDest';
const TEXT_FIELD_FINAL_DEST = 'finalDest';

const App = () => (
  <MuiThemeProvider>
    <RoadtripComponent />
  </MuiThemeProvider>
);


const RoadtripComponent = React.createClass({
  getInitialState: function() {
    return {
      origin: '',
      destination: '',
    }
  },

  handleSubmit_: function(data) {
    this.setState(data, this.updateMap_);
  },

  updateMap_: function() {
    const request = {
      origin: this.state.origin,
      destination: this.state.destination,
      travelMode: 'DRIVING'
    };
    directionsService.route(request, function(result, status) {
      if (status == 'OK') {
        const pathCoordinates = result.routes[0].overview_path;
        const stopCooordinates = pathCoordinates[pathCoordinates.length / 2];
        console.log(stopCooordinates.lat() + ', ' + stopCooordinates.lng());
        directionsDisplay.setDirections(result);
      }
      // TODO: Handle error statuses.
    });
  },

  render: function() {
    return (
      <div className="container">
        <AppBar title="Roadtrip" />
        <div className="content">
          <div className="form-map-container">
            <FormComponent onSubmit={this.handleSubmit_} />
            <MapComponent origin={this.state.origin} destination={this.state.destination} />
          </div>
          <ResultsComponent />
        </div>
      </div>
    );
  }
});


const FormComponent = React.createClass({
  getInitialState: function() {
    return {origin: '', destination: ''};
  },

  handleOriginChange_: function(e) {
    this.setState({origin: e.target.value});
  },

  handleDestinationChange_: function(e) {
    this.setState({destination: e.target.value});
  },

  handleClick_: function() {
    this.props.onSubmit({origin: this.state.origin, destination: this.state.destination});
  },

  render: function() {
    return (
      <form className="form-container">
        <FormTextField floatingLabelText="Start Location" id={TEXT_FIELD_START_DEST}
            onKeyDown={this.handleOriginChange_} />
        <FormTextField floatingLabelText="Final Destination" id={TEXT_FIELD_FINAL_DEST}
            onKeyDown={this.handleDestinationChange_} />
        <FormTextField floatingLabelText="Stop For (e.g. lunch, coffee)" />

        <FormSlider startValue="0" endValue="2h" />
        <FormSlider startValue="Quality" endValue="Distance" /> 

        <RaisedButton label="Go" primary={true} className="submit-button" onClick={this.handleClick_} />
      </form>
    );
  }
});


/** Text field with customized styling. */
const FormTextField = (props) => (
  <TextField floatingLabelText={props.floatingLabelText} placeholder="" id={props.id}
      style={{ display: 'block', width: '100%' }} onKeyDown={props.onKeyDown} />
);


/** Slider with customized styling. */
const FormSlider = (props) => (
  <div className="slider-container">
    <span>{props.startValue}</span>
    <Slider value={0.5} style={{ width: '100%', margin: '0 8px' }} 
        sliderStyle={{ marginTop: '18px', marginBottom: '24px' }} />
    <span>{props.endValue}</span>
  </div>
);


const ResultsComponent = React.createClass({
  render: function() {
    return (
      <div className="results-container">
        <h2>Results</h2>
      </div>
    );
  }
});


const MapComponent = React.createClass({
  render: function() {
    var src = "https://www.google.com/maps/embed/v1/directions?key=AIzaSyCW5ncOHTYAkqoTTN4Uu8rW2Vxgnxo82O4" +
        "&origin=" + encodeURIComponent(this.props.origin) +
        "&destination=" + encodeURIComponent(this.props.destination);

    return (
      <div className="map-container">
        <div className="map-iframe-container" id="map">
        /*
          <iframe
            className="map-iframe"
            width="350"
            height="350"
            frameBorder="0" style={{ border: '0' }}
            src={src}
            allowFullScreen>
          </iframe>
          */
        </div>
      </div>
    );
  }
});


let autocompleteStartDest;
let autocompleteFinalDest;

let directionsDisplay;
let directionsService = new google.maps.DirectionsService();
let map;

function initMap() {
  directionsDisplay = new google.maps.DirectionsRenderer();
  const chicago = new google.maps.LatLng(41.850033, -87.6500523);
  var mapOptions = {
    zoom: 7,
    center: chicago
  }
  map = new google.maps.Map(document.getElementById('map'), mapOptions);
  directionsDisplay.setMap(map);
}

function initAutocomplete() {
  autocompleteStartDest = new google.maps.places.Autocomplete(
    /** @type {!HTMLInputElement} */(document.getElementById(TEXT_FIELD_START_DEST)));
  autocompleteFinalDest = new google.maps.places.Autocomplete(
    /** @type {!HTMLInputElement} */(document.getElementById(TEXT_FIELD_FINAL_DEST)));
};


function main() {
  ReactDOM.render(
    <App />,
    document.getElementById('app')
  );

  initAutocomplete();
  initMap();
};

main();
