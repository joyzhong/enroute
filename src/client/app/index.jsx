import AppBar from 'material-ui/AppBar';
import FlatButton from 'material-ui/FlatButton';
import IconButton from 'material-ui/IconButton';
import NavigationArrowBack from 'material-ui/svg-icons/navigation/arrow-back';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';
import React from 'react';
import ReactDOM from 'react-dom';
import Slider from 'material-ui/Slider';
import TextField from 'material-ui/TextField';
import injectTapEventPlugin from 'react-tap-event-plugin';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import {Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn} from 'material-ui/Table';
import {indigo500, deepOrange600} from 'material-ui/styles/colors';

// Needed for onTouchTap 
// http://stackoverflow.com/a/34015469/988941 
injectTapEventPlugin();

const TEXT_FIELD_START_DEST = 'textFieldStartDest';
const TEXT_FIELD_FINAL_DEST = 'textFieldFinalDest';

const muiTheme = getMuiTheme({
  palette: {
    primary1Color: indigo500,
    accent1Color: deepOrange600,
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

const RoadtripComponent = React.createClass({
  getInitialState() {
    return {
      origin: '',
      destination: '',
      term: '',

      selectedResultIndex: -1, // Index of the selected stop in the results array.
      results: [],
      stopFractionInTrip: 0.5,
      directionsLink: '',
      tripTimeSec: 0, // Time from origin to destination, in seconds.
      mapMode: false, // Whether the component is in map mode, for mobile screens.
    }
  },

  componentDidMount() {
    this.initializeMapsAutocomplete_();
    this.initializeMap_();
  },

  initializeMap_() {
    directionsDisplay = new google.maps.DirectionsRenderer();
    const nycCoord = new google.maps.LatLng(40.7128, -74.0060);
    const options = {
      zoom: 7,
      center: nycCoord,
    }
    map = new google.maps.Map(document.getElementById('map'), options);
    directionsDisplay.setMap(map);
  },

  initializeMapsAutocomplete_() {
    const options = {
      placeIdOnly: true,
    };

    const /** @type {!HTMLInputElement} */ startDestTextField =
        (document.getElementById(TEXT_FIELD_START_DEST));
    const autocompleteStartDest =
        new google.maps.places.Autocomplete(startDestTextField, options);
    autocompleteStartDest.addListener('place_changed', () => {
      this.handleChange_({
        origin: autocompleteStartDest.getPlace()['name'],
      });
    });

    const /** @type {!HTMLInputElement} */ finalDestTextField =
        (document.getElementById(TEXT_FIELD_FINAL_DEST));
    const autocompleteFinalDest =
        new google.maps.places.Autocomplete(finalDestTextField, options);
    autocompleteFinalDest.addListener('place_changed', () => {
      this.handleChange_({
        destination: autocompleteFinalDest.getPlace()['name'],
      });
    });
  },

  handleChange_(data) {
    this.setState(data);
  },

  /**
   * Updates the map with the current origin and destination state,
   * and makes a Yelp API call to update the waypoints.
   */
  updateMap_() {
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
          mapMode: true,
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
  },

  updateDirectionsLink_() {
    const startAddress = encodeURIComponent(this.state.origin);
    const destAddress = encodeURIComponent(this.state.destination);
    const waypoint = this.state.results[this.state.selectedResultIndex];
    const waypointAddress = encodeURIComponent(
        waypoint.name + ',' + waypoint.location.address + ',' +
        waypoint.location.city + ',' + waypoint.location.country_code);
    this.state.directionsLink = 
        `http://maps.google.com/maps/dir/${startAddress}/${waypointAddress}/${destAddress}`;
  },

  updateWaypoint_(selectedResultIndex) {
    this.setState({selectedResultIndex: selectedResultIndex}, () => {
      const businessCoordinate = 
          this.state.results[this.state.selectedResultIndex].location.coordinate;
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
        // TODO: Handle error statuses.
      };

      directionsService.route(request, displayDirectionsFn);

      this.updateDirectionsLink_();
    });
  },

  updateLocationMarker_(resultIndex) {
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

  clearLocationMarker_() {
    if (locationMarker) {
      locationMarker.setMap(null);
    }
  },

  clearSelectedResultIndex_() {
    this.setState({selectedResultIndex: -1});
  },

  /**
   * @param {number} latitude
   * @param {number} longitude
   */
  getStopsListFromYelp_(latitude, longitude) {
    $.ajax({
      context: this,
      type: 'POST',
      url: '/yelp', 
      data: { term: this.state.term, latitude: latitude, longitude: longitude },
      success: (yelpResults) => {
        console.log(yelpResults.businesses);

        const businesses = yelpResults.businesses;
        const midpoints = businesses.map((result) => {
          return {
            lat: result.location.coordinate.latitude,
            lng: result.location.coordinate.longitude,
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

              this.setState({results: yelpResults.businesses});
            });
      }
    });
  },

  /**
   * Makes a request via Google Maps Directions Matrix API.
   * or rejects if the request fails.
   * @param {!Array<string|!Object>} origins
   * @param {!Array<string|!Object>} destinations
   * @return {!Promise} Promise that resolves with the successful response,
   *    or rejects if the request fails.
   */
  getDirectionsMatrix_(origins, destinations) {
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
  },

 // TODO: Investigate just making this an href?
  onDirectionsButtonClick_() {
    const win = window.open(this.state.directionsLink, '_blank');
    if (win) {
      win.focus();
    } else {
      alert('Please disable your popup blocker to view the directions.');
    }
  },

  onBackButtonClick_() {
    this.setState({
      mapMode: false
    });
  },

  render() {
    const contentClassName = this.state.mapMode ? 'content map-mode' : 'content';

    return (
      <div className="container">
        <div className="app-title">
          <span>Enroute</span>
        </div>
        {/*<AppBar title="Roadtrip" />*/}
        <div className={contentClassName}>
          <div className="form-map-container">
            <FormComponent onSubmit={this.updateMap_}
                onChange={this.handleChange_}
                initialSliderValue={this.state.stopFractionInTrip}
                origin={this.state.origin} destination={this.state.destination}
                term={this.state.term} />
            <MapComponent onDirectionsClick={this.onDirectionsButtonClick_}
                onBackButtonClick={this.onBackButtonClick_} />
          </div>
          <ResultsComponent onRowSelection={this.updateWaypoint_} 
              onRowHoverExit={this.clearLocationMarker_}
              onRowHover={this.updateLocationMarker_} 
              results={this.state.results}
              selectedResultIndex={this.state.selectedResultIndex}
              tripTimeSec={this.state.tripTimeSec}
              onOnboardingSelection={this.handleChange_} />
        </div>
      </div>
    );
  }
});

const FormComponent = React.createClass({
  // TODO: Refactor, DRY!
  handleOriginChange_(e) {
    this.props.onChange({origin: e.target.value});
  },

  handleDestinationChange_(e) {
    this.props.onChange({destination: e.target.value});
  },

  handleTermChange_(e) {
    this.props.onChange({term: e.target.value});
  },

  handleSliderDragStop_(e, value) {
    this.props.onChange({stopFractionInTrip: value});
  },

  handleClick_() {
    this.props.onSubmit();
  },

  render() {
    return (
      <form className="form-container">
        <FormTextField floatingLabelText="Start Location" 
            id={TEXT_FIELD_START_DEST}
            onChange={this.handleOriginChange_}
            value={this.props.origin} />
        <FormTextField floatingLabelText="Final Destination"
            id={TEXT_FIELD_FINAL_DEST}
            onChange={this.handleDestinationChange_}
            value={this.props.destination} />
        <FormTextField floatingLabelText="Stop for (e.g. lunch, coffee)..."
            id='Term' value={this.props.term}
            onChange={this.handleTermChange_} />

        <FormSlider value={this.props.initialSliderValue}
            onChange={this.handleSliderDragStop_} />
        {/*<FormSlider startValue="Quality" endValue="Distance" /> */}

        <RaisedButton label="Go" primary={true} onClick={this.handleClick_} />
        <a className="yelp-image" href="https://www.yelp.com" target="_blank">
          <img src="https://s3-media2.fl.yelpcdn.com/assets/srv0/developer_pages/95212dafe621/assets/img/yelp-2c.png" />
        </a>
      </form>
    );
  }
});

/** Text field with customized styling. */
const FormTextField = (props) => (
  <TextField floatingLabelText={props.floatingLabelText}
      placeholder="" id={props.id}
      style={{ display: 'block', marginTop: '-6px', width: '100%' }}
      onChange={props.onChange}
      value={props.value} />
);

/** Slider with customized styling. */
const FormSlider = (props) => (
  <div className="slider-container">
    <div className="slider-header">Stop Distance into Trip</div>
    <Slider value={props.value} style={{ width: '100%' }} 
        sliderStyle={{ marginTop: '14px', marginBottom: '16px' }}
        onChange={props.onChange} />
  </div>
);

const OnboardingComponent = React.createClass({
  handleOnboarding1_() {
    this.props.onOnboardingSelection({
      origin: 'San Francisco, CA, USA',
      destination: 'Los Angeles, CA, USA',
      term: 'lunch',
    });
  },

  handleOnboarding2_() {
    this.props.onOnboardingSelection({
      origin: 'New York City, NY, USA',
      destination: 'Boston, MA, USA',
      term: 'coffee',
    });
  },

  render() {
    return (
      <div className="onboarding-container">
        <span className="onboarding-summary">
          Enroute helps you find the best places to stop when you travel.
          Try it out!
          <p onClick={this.handleOnboarding1_}>
            Stop for lunch on a road trip from SF to LA
          </p>
          <p onClick={this.handleOnboarding2_}>
            Grab coffee on the drive from NYC to Boston
          </p>
        </span>
      </div>
    )
  }
});

const ResultsComponent = React.createClass({
  handleRowSelection_(selectedRows) {
    if (selectedRows.length > 0) {
      this.props.onRowSelection(selectedRows[0]);
    }
  },

  handleRowHover_(rowNumber) {
    this.props.onRowHover(rowNumber);
  },

  /**
  * Called when a business link is clicked, to open the Yelp business page.
  * @param {!Object} event
  */
  handleLinkClick_(event) {
    // Prevent bubbling up, so that the row is not selected.
    event.stopPropagation();
  },

  render() {
    return (
      <div className="results-container">

        {this.props.results.length == 0 &&
          <OnboardingComponent 
              onOnboardingSelection={this.props.onOnboardingSelection} />}

        <Table onRowHover={this.handleRowHover_}
            onRowHoverExit={this.props.onRowHoverExit} 
            onRowSelection={this.handleRowSelection_}>

          {this.props.results.length > 0 &&
            <TableHeader adjustForCheckbox={false} displaySelectAll={false}>
              <TableRow>
                <TableHeaderColumn 
                    style={{paddingLeft: '12px', paddingRight: '12px'}}
                    className="header-column">
                  Name
                </TableHeaderColumn>
                <TableHeaderColumn className="header-column"
                    style={{paddingLeft: '12px', paddingRight: '12px'}}>
                    Rating / # Reviews
                </TableHeaderColumn>
                <TableHeaderColumn className="column-short header-column"
                    style={{paddingLeft: '12px', paddingRight: '12px'}}>
                  Time (from <TimeFormatSpan 
                      timeInMin={Math.round(this.props.tripTimeSec / 60)} />)
                </TableHeaderColumn>
              </TableRow>
            </TableHeader>
          }

          <TableBody displayRowCheckbox={false}
              showRowHover={true}
              deselectOnClickaway={false}>
            {
              this.props.results.map((result, index) => (
                <TableRow key={result.id} style={{cursor: 'pointer' }}
                    selected={index == this.props.selectedResultIndex}>
                  <TableRowColumn style={{paddingLeft: '12px', paddingRight: '12px'}}>
                    <a href={result.url} target="_blank"
                        onClick={this.handleLinkClick_}>{result.name}</a>
                  </TableRowColumn>
                  <TableRowColumn style={{paddingLeft: '12px', paddingRight: '12px'}}>
                    <img src={result.rating_img_url}
                        className="yelp-star-img"
                        style={{ verticalAlign: 'middle' }} />
                        {' '}/{' '}
                        {result.review_count}
                  </TableRowColumn>
                  <TableRowColumn className="column-short"
                      style={{paddingLeft: '12px', paddingRight: '12px'}}>
                    +<TimeFormatSpan timeInMin={result.min_added} />
                  </TableRowColumn>
                </TableRow>
              ))
            }
          </TableBody>

        </Table>
      </div>
    );
  }
});

const TableRowColumnDefault = (props) => (
  <TableRowColumn className={props.className}
      style={{paddingLeft: '12px', paddingRight: '12px'}}>
    {props.content}
  </TableRowColumn>
);

const MapComponent = (props) => (
  <div className="map-container">
    <div className="map-header-container">
      <div className="back-button-container">
        <IconButton onClick={props.onBackButtonClick}>
          <NavigationArrowBack />
        </IconButton>
      </div>
      <h2 className="map-title">
        Map
      </h2>
      <FlatButton label="Directions" secondary={true}
          onClick={props.onDirectionsClick} />
    </div>

    <div className="map-iframe-container" id="map">
      // Map is inserted here.
    </div>
  </div>
);

const TimeFormatSpan = (props) => (
  <span>
  {
    props.timeInMin >= 60 ?
      <span>
        {Math.floor(props.timeInMin / 60)}h {props.timeInMin % 60}min
      </span> :
      <span>
        {props.timeInMin} min
      </span>
  }
  </span>
);


const runApp = () => {
  ReactDOM.render(
    <App />,
    document.getElementById('app')
  );
};

runApp();
