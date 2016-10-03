import AppBar from 'material-ui/AppBar';
import {Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn} from 'material-ui/Table';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';
import React from 'react';
import ReactDOM from 'react-dom';
import Slider from 'material-ui/Slider';
import TextField from 'material-ui/TextField';
import injectTapEventPlugin from 'react-tap-event-plugin';
 
// Needed for onTouchTap 
// http://stackoverflow.com/a/34015469/988941 
injectTapEventPlugin();

const TEXT_FIELD_START_DEST = 'textFieldStartDest';
const TEXT_FIELD_FINAL_DEST = 'textFieldFinalDest';
const TEXT_FIELD_TERM = 'textFieldTerm';

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
      term: '',
      selectedResultIndex: -1, // Index of the selected stop in the results array.
      results: [],
      stopFractionInTrip: 0.5,
      directionsLink: '',
    }
  },

  handleChange_: function(data) {
    this.setState(data);
  },

  /** Updates the map with the current origin and destination state. */
  updateMap_: function() {
    this.clearLocationMarker_();
    this.clearSelectedResultIndex_();

    const request = {
      origin: this.state.origin,
      destination: this.state.destination,
      travelMode: 'DRIVING'
    };
    const displayDirectionsFn = function(result, status) {
      if (status == 'OK') {
        const pathCoordinates = result.routes[0].overview_path;
        const indexInTrip = Math.round((pathCoordinates.length - 1) * this.state.stopFractionInTrip);
        const stopCooordinates = pathCoordinates[indexInTrip];
        directionsDisplay.setDirections(result);
        this.getStopsListFromYelp_(stopCooordinates.lat(), stopCooordinates.lng());
      }
      // TODO: Handle error statuses.
    }.bind(this);

    directionsService.route(request, displayDirectionsFn);
  },

  updateDirectionsLink_: function() {
    const startAddress = encodeURIComponent(this.state.origin);
    const destAddress = encodeURIComponent(this.state.destination);
    const waypoint = this.state.results[this.state.selectedResultIndex];
    const waypointAddress = encodeURIComponent(
        waypoint.name + ',' + waypoint.location.address + ',' +
        waypoint.location.city + ',' + waypoint.location.country_code);
    this.state.directionsLink = 
        `http://maps.google.com/maps/dir/${startAddress}/${waypointAddress}/${destAddress}`;
  },

  updateWaypoint_: function(selectedResultIndex) {
    this.setState({selectedResultIndex: selectedResultIndex}, () => {
      const businessCoordinate = this.state.results[this.state.selectedResultIndex].location.coordinate;
      const latLng = new google.maps.LatLng(businessCoordinate.latitude, businessCoordinate.longitude);
      const request = {
        origin: this.state.origin,
        destination: this.state.destination,
        waypoints: [{location: latLng}],
        travelMode: 'DRIVING'
      };
      const displayDirectionsFn = function(result, status) {
        if (status == 'OK') {
          const pathCoordinates = result.routes[0].overview_path;
          const stopCooordinates = pathCoordinates[Math.round(pathCoordinates.length / 2)];
          directionsDisplay.setDirections(result);
        }
        // TODO: Handle error statuses.
      }.bind(this);

      directionsService.route(request, displayDirectionsFn);

      this.updateDirectionsLink_();
    });
  },

  updateLocationMarker_: function(resultIndex) {
    this.clearLocationMarker_();

    // Get the latitude and longitude of the result.
    const business = this.state.results[resultIndex];
    locationMarker = new google.maps.Marker({
        position: new google.maps.LatLng(
          business.location.coordinate.latitude,
          business.location.coordinate.longitude
        ),
        map: map
    });
  },

  clearLocationMarker_: function() {
    if (locationMarker) {
      locationMarker.setMap(null);
    }
  },

  clearSelectedResultIndex_: function() {
    this.setState({selectedResultIndex: -1});
  },

  getStopsListFromYelp_: function(latitude, longitude) {
    $.ajax({
      context: this,
      type: 'POST',
      url: '/yelp', 
      data: { term: this.state.term, latitude: latitude, longitude: longitude },
      success: function(yelpResults) {
        console.log(yelpResults.businesses);
        const latitude = yelpResults.businesses[0].location.coordinate.latitude;
        const longitude = yelpResults.businesses[0].location.coordinate.longitude;
        this.setState({results: yelpResults.businesses});
      }
    });
  },

  onDirectionsButtonClick_: function() {
    const win = window.open(this.state.directionsLink, '_blank');
    if (win) {
      win.focus();
    } else {
      alert('Please disable your popup blocker to view the directions.');
    }
  },

  render: function() {
    return (
      <div className="container">
        <AppBar title="Roadtrip" />
        <div className="content">
          <div className="form-map-container">
            <FormComponent onSubmit={this.updateMap_} onChange={this.handleChange_}
                initialSliderValue={this.state.stopFractionInTrip} />
            <MapComponent onClick={this.onDirectionsButtonClick_} />
          </div>
          <ResultsComponent onRowSelection={this.updateWaypoint_} 
              onRowHoverExit={this.clearLocationMarker_}
              onRowHover={this.updateLocationMarker_} 
              results={this.state.results}
              selectedResultIndex={this.state.selectedResultIndex} />
        </div>
      </div>
    );
  }
});


const FormComponent = React.createClass({
  // TODO: Refactor, DRY!
  handleOriginChange_: function(e) {
    this.props.onChange({origin: e.target.value});
  },

  handleOriginKeyDown_: function(e) {
    if (e.keyCode == 13 /* Enter */) {
      this.props.onChange({origin: e.target.value});
    }
  },

  handleDestinationChange_: function(e) {
    this.props.onChange({destination: e.target.value});
  },

  handleDestinationKeyDown_: function(e) {
    if (e.keyCode == 13 /* Enter */) {
      this.props.onChange({destination: e.target.value});
    }
  },

  handleTermChange_: function(e) {
    this.props.onChange({term: e.target.value});
  },

  handleSliderDragStop_: function(e, value) {
    this.props.onChange({stopFractionInTrip: value});
  },

  handleClick_: function() {
    this.props.onSubmit();
  },

  render: function() {
    return (
      <form className="form-container">
        <FormTextField floatingLabelText="Start Location" id={TEXT_FIELD_START_DEST}
            onChange={this.handleOriginChange_} onKeyDown={this.handleOriginKeyDown_} />
        <FormTextField floatingLabelText="Final Destination" id={TEXT_FIELD_FINAL_DEST}
            onChange={this.handleDestinationChange_} onKeyDown={this.handleDestinationKeyDown_} />
        <FormTextField floatingLabelText="Stop for (e.g. lunch, coffee)..." id='Term'
            onChange={this.handleTermChange_} />

        <FormSlider value={this.props.initialSliderValue} onChange={this.handleSliderDragStop_} />
        {/*<FormSlider startValue="Quality" endValue="Distance" /> */}

        <RaisedButton label="Go" primary={true} onClick={this.handleClick_} />
      </form>
    );
  }
});


/** Text field with customized styling. */
const FormTextField = (props) => (
  <TextField floatingLabelText={props.floatingLabelText} placeholder="" id={props.id}
      style={{ display: 'block', width: '100%' }} onKeyDown={props.onKeyDown} onChange={props.onChange} />
);


/** Slider with customized styling. */
const FormSlider = (props) => (
  <div className="slider-container">
    <div className="slider-header">Stop Distance into Trip</div>
    <Slider value={props.value} style={{ width: '100%' }} 
        sliderStyle={{ marginTop: '18px', marginBottom: '24px' }}
        onChange={props.onChange} />
  </div>
);


const ResultsComponent = React.createClass({
  handleRowSelection_: function(selectedRows) {
    if (selectedRows.length > 0) {
      this.props.onRowSelection(selectedRows[0]);
    }
  },

  handleRowHover_: function(rowNumber) {
    this.props.onRowHover(rowNumber);
  },

  render: function() {
    return (
      <div className="results-container">
        <Table onRowHover={this.handleRowHover_} onRowHoverExit={this.props.onRowHoverExit} 
            onRowSelection={this.handleRowSelection_}>
          <TableHeader adjustForCheckbox={false} displaySelectAll={false}>
            <TableRow>
              <TableHeaderColumn>Name</TableHeaderColumn>
              <TableHeaderColumn>Rating</TableHeaderColumn>
              <TableHeaderColumn># Reviews</TableHeaderColumn>
            </TableRow>
          </TableHeader>
          <TableBody displayRowCheckbox={false} showRowHover={true} deselectOnClickaway={false}>
            {
              this.props.results.map((result, index) => (
                <TableRow key={result.id} style={{cursor: 'pointer' }}
                    selected={index == this.props.selectedResultIndex}>
                  <TableRowColumn>{result.name}</TableRowColumn>
                  <TableRowColumn>{result.rating}</TableRowColumn>
                  <TableRowColumn>{result.review_count}</TableRowColumn>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>
    );
  }
});


const ResultItem = (props) => (
  <TableRow hoverable={true} style={{cursor: 'pointer' }}>
    <TableRowColumn>{props.result.name}</TableRowColumn>
    <TableRowColumn>{props.result.rating}</TableRowColumn>
    <TableRowColumn>{props.result.review_count}</TableRowColumn>
  </TableRow>
);


const MapComponent = (props) => (
  <div className="map-container">
    <div className="map-header-container">
      <h2 className="map-header">
        Route
      </h2>
      <RaisedButton label="Directions" primary={true} onClick={props.onClick} />
    </div>

    <div className="map-iframe-container" id="map">
      // Map is inserted here.
    </div>
  </div>
);


// TODO: Refactor map stuff into new file?
let autocompleteStartDest;
let autocompleteFinalDest;

let directionsDisplay;
const directionsService = new google.maps.DirectionsService();
let map;
let locationMarker;

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
