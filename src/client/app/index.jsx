import AppBar from 'material-ui/AppBar';
import FormComponent from './form.jsx';
import MapComponent from './map.jsx';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import OnboardingComponent from './onboarding.jsx';
import React from 'react';
import ReactDOM from 'react-dom';
import ResultsComponent from './results.jsx';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import injectTapEventPlugin from 'react-tap-event-plugin';
import {blueGrey600, cyan400} from 'material-ui/styles/colors';

// Needed for onTouchTap 
// http://stackoverflow.com/a/34015469/988941 
injectTapEventPlugin();

const muiTheme = getMuiTheme({
  fontFamily: '"Source Sans Pro", "Helvetica Neue", Arial, sans-serif', 
  palette: {
    primary1Color: cyan400,
    accent1Color: blueGrey600,
  },
  svgIcon: {
    color: blueGrey600,
  },
});

// Google Maps global variables.
let directionsDisplay;
let map;
let locationMarker;
const directionsService = new google.maps.DirectionsService();
const distanceMatrixService = new google.maps.DistanceMatrixService();

const App = () => (
  <MuiThemeProvider muiTheme={muiTheme}>
    <RoadtripComponent />
  </MuiThemeProvider>
);

class RoadtripComponent extends React.Component {
  state = {
    origin: '',
    destination: '',
    term: '',

    selectedResultIndex: -1, // Index of the selected stop in the results array.
    results: [],
    stopFractionInTrip: 0.5,
    directionsLink: '',
    tripTimeSec: 0, // Time from origin to destination, in seconds.

    mapMode: false, // Whether the component is in map mode, for mobile screens.
    isLoading: false, // Whether the component is loading Map/Yelp results.
  }

  componentDidMount() {
    this.initializeMap_();
  }

  initializeMap_ = () => {
    directionsDisplay = new google.maps.DirectionsRenderer();
    const nycCoord = new google.maps.LatLng(40.7128, -74.0060);
    const options = {
      zoom: 7,
      center: nycCoord,
    }
    map = new google.maps.Map(document.getElementById('map'), options);
    directionsDisplay.setMap(map);
  };

  handleChange_ = (data) => {
    this.setState(data);
  };

  /**
   * Updates the map with the current origin and destination state,
   * and makes a Yelp API call to update the waypoints.
   */
  updateMap_ = () => {
    this.setState({
      isLoading: true,
      mapMode: true,
    });

    this.clearLocationMarker_();
    this.clearSelectedResultIndex_();

    const request = {
      origin: this.state.origin,
      destination: this.state.destination,
      travelMode: 'DRIVING'
    };
    const displayDirectionsFn = (result, status) => {
      if (status == 'OK') {
        const pathCoordinates = result.routes[0].overview_path;
        const indexInTrip = Math.round(
            (pathCoordinates.length - 1) * this.state.stopFractionInTrip);
        const stopCooordinates = pathCoordinates[indexInTrip];
        directionsDisplay.setDirections(result);

        this.setState({
          tripTimeSec: result.routes[0].legs[0].duration.value,
        }, () => {
          // Trigger 'resize' event after displaying map on small screens,
          // so directions render correctly.
          google.maps.event.trigger(map, 'resize');

          this.getStopsListFromYelp_(
              stopCooordinates.lat(), stopCooordinates.lng());
        });
      }
      // TODO: Handle error statuses.
    };

    // Get the directions and then execute displayDirectionsFn.
    directionsService.route(request, displayDirectionsFn);
  };

  updateDirectionsLink_ = () => {
    const startAddress = encodeURIComponent(this.state.origin);
    const destAddress = encodeURIComponent(this.state.destination);
    const waypoint = this.state.results[this.state.selectedResultIndex];
    if (waypoint) {
      const waypointAddress = encodeURIComponent(
          waypoint.name + ',' + waypoint.location.display_address.join());
      this.state.directionsLink = 
          `http://maps.google.com/maps/dir/${startAddress}/${waypointAddress}/${destAddress}`;
      } else {
        this.state.directionsLink = 
            `http://maps.google.com/maps/dir/${startAddress}/${destAddress}`;
      }
  };

  updateWaypoint_ = (selectedResultIndex) => {
    this.setState({selectedResultIndex: selectedResultIndex}, () => {
      const businessCoordinate = 
          this.state.results[this.state.selectedResultIndex].coordinates;
      const latLng = new google.maps.LatLng(
          businessCoordinate.latitude, businessCoordinate.longitude);
      const request = {
        origin: this.state.origin,
        destination: this.state.destination,
        waypoints: [{location: latLng}],
        travelMode: 'DRIVING'
      };
      const displayDirectionsFn = (result, status) => {
        if (status == 'OK') {
          const pathCoordinates = result.routes[0].overview_path;
          const stopCooordinates =
              pathCoordinates[Math.round(pathCoordinates.length / 2)];
          directionsDisplay.setDirections(result);
        }
        // TODO: Handle error statuses  .
      };

      directionsService.route(request, displayDirectionsFn);
    });
  };

  updateLocationMarker_ = (resultIndex) => {
    this.clearLocationMarker_();

    // Get the latitude and longitude of the result.
    const business = this.state.results[resultIndex];
    locationMarker = new google.maps.Marker({
        position: new google.maps.LatLng(
          business.coordinates.latitude,
          business.coordinates.longitude
        ),
        map: map
    });
  };

  clearLocationMarker_ = () => {
    if (locationMarker) {
      locationMarker.setMap(null);
    }
  };

  clearSelectedResultIndex_ = () => {
    this.setState({selectedResultIndex: -1});
  };

  /**
   * @param {number} latitude
   * @param {number} longitude
   */
  getStopsListFromYelp_ = (latitude, longitude) => {
    $.ajax({
      context: this,
      type: 'POST',
      url: '/yelp', 
      data: { term: this.state.term, latitude: latitude, longitude: longitude },
      success: (response) => {
        const businesses = response.jsonBody.businesses;
        const midpoints = businesses.map((result) => {
          return {
            lat: result.coordinates.latitude,
            lng: result.coordinates.longitude,
          };
        });
        const originToMidpointsDists = this.getDirectionsMatrix_(
            [this.state.origin], midpoints);
        const midpointsToDestDists = this.getDirectionsMatrix_(
            midpoints, [this.state.destination]);
        Promise.all([originToMidpointsDists, midpointsToDestDists])
            .then((responses) => {
              const legATimes = responses[0].rows[0].elements;
              const legBTimes = responses[1].rows.map((row) => {
                return row.elements[0];
              });

              businesses.forEach((business, index) => {
                const totalTripTimeSec = legATimes[index].duration.value +
                    legBTimes[index].duration.value;
                business['min_added'] = Math.round(
                    (totalTripTimeSec - this.state.tripTimeSec) / 60);
              });

              this.setState({
                results: businesses,
                isLoading: false,
              });
            });
      }
    });
  };

  /**
   * Makes a request via Google Maps Directions Matrix API.
   * or rejects if the request fails.
   * @param {!Array<string|!Object>} origins
   * @param {!Array<string|!Object>} destinations
   * @return {!Promise} Promise that resolves with the successful response,
   *    or rejects if the request fails.
   */
  getDirectionsMatrix_ = (origins, destinations) => {
    const promise = new Promise((resolve, reject) => {
      distanceMatrixService.getDistanceMatrix({
        origins: origins,
        destinations: destinations,
        travelMode: google.maps.DirectionsTravelMode.DRIVING,
      }, (response, status) => {
        if (status == 'OK') {
          resolve(response);
        } else {
          reject('Directions matrix request failed.');
        }
      });
    });

    return promise;
  };

 // TODO: Investigate just making this an href?
  onDirectionsButtonClick_ = () => {
    this.updateDirectionsLink_();
    const win = window.open(this.state.directionsLink, '_blank');
    if (win) {
      win.focus();
    } else {
      alert('Please disable your popup blocker to view the directions.');
    }
  };

  onBackButtonClick_ = () => {
    this.setState({
      mapMode: false
    });
  };

  render() {
    const containerClassName =
        this.state.mapMode ? 'container map-mode' : 'container';
    const resultsClass = this.state.isLoading ?
        'results-container loading' : 'results-container';

    return (
      <div className={containerClassName}>
        <div className="app-title">
          <span>Enroute</span>
        </div>
        <div className="content">
          <div className="form-map-container">
            <FormComponent
                onSubmit={this.updateMap_}
                onChange={this.handleChange_}
                initialSliderValue={this.state.stopFractionInTrip}
                origin={this.state.origin}
                destination={this.state.destination}
                term={this.state.term} />
            <OnboardingComponent 
                onOnboardingSelection={this.handleChange_} />
          </div>

          <div className={resultsClass}>
            <MapComponent
                directionsIconHoverColor={muiTheme.palette.primary1Color}
                onDirectionsClick={this.onDirectionsButtonClick_}
                onBackButtonClick={this.onBackButtonClick_}
                disabled={!this.state.origin || !this.state.destination} />
            <ResultsComponent
                onRowSelection={this.updateWaypoint_} 
                onRowHoverExit={this.clearLocationMarker_}
                onRowHover={this.updateLocationMarker_} 
                results={this.state.results}
                isLoading={this.state.isLoading}
                selectedResultIndex={this.state.selectedResultIndex}
                tripTimeSec={this.state.tripTimeSec} />
          </div>
        </div>
      </div>
    );
  }
};

const runApp = () => {
  ReactDOM.render(
    <App />,
    document.getElementById('app')
  );
};

runApp();
