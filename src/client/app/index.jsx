import AppBar from 'material-ui/AppBar';
import AutoComplete from 'material-ui/AutoComplete';
import CircularProgress from 'material-ui/CircularProgress';
import FlatButton from 'material-ui/FlatButton';
import IconButton from 'material-ui/IconButton';
import NavigationArrowBack from 'material-ui/svg-icons/navigation/arrow-back';
import NavigationClose from 'material-ui/svg-icons/navigation/close';
import NearMe from 'material-ui/svg-icons/maps/near-me';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';
import React from 'react';
import ReactDOM from 'react-dom';
import Slider from 'material-ui/Slider';
import TextField from 'material-ui/TextField';
import injectTapEventPlugin from 'react-tap-event-plugin';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import {Card, CardActions, CardHeader, CardMedia, CardTitle, CardText} from 'material-ui/Card';
import {MenuItem} from 'material-ui/Menu';
import {Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn} from 'material-ui/Table';
import {blueGrey600, cyan400, grey500, grey700} from 'material-ui/styles/colors';

// Needed for onTouchTap 
// http://stackoverflow.com/a/34015469/988941 
injectTapEventPlugin();

const TEXT_FIELD_START_DEST = 'textFieldStartDest';
const TEXT_FIELD_FINAL_DEST = 'textFieldFinalDest';

const muiTheme = getMuiTheme({
  palette: {
    primary1Color: cyan400,
    accent1Color: blueGrey600,
  },
});

// Google Maps global variables.
let directionsDisplay;
let map;
let locationMarker;
const autocompleteService = new google.maps.places.AutocompleteService();
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
          waypoint.name + ',' + waypoint.location.address + ',' +
          waypoint.location.city + ',' + waypoint.location.country_code);
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
    });
  };

  updateLocationMarker_ = (resultIndex) => {
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
      success: (yelpResults) => {
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

              this.setState({
                results: yelpResults.businesses,
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
            <MapComponent
                onDirectionsClick={this.onDirectionsButtonClick_}
                onBackButtonClick={this.onBackButtonClick_}
                disabled={!this.state.origin || !this.state.destination} />
          </div>
          <ResultsComponent
              onRowSelection={this.updateWaypoint_} 
              onRowHoverExit={this.clearLocationMarker_}
              onRowHover={this.updateLocationMarker_} 
              results={this.state.results}
              isLoading={this.state.isLoading}
              selectedResultIndex={this.state.selectedResultIndex}
              tripTimeSec={this.state.tripTimeSec}
              onOnboardingSelection={this.handleChange_} />
        </div>
      </div>
    );
  }
};

class FormComponent extends React.Component {
  handleChange_ = (state) => {
    this.props.onChange(state);
  };

  handleTermChange_ = (e) => {
    this.props.onChange({term: e.target.value});
  };

  handleSliderDragStop_ = (e, value) => {
    this.props.onChange({stopFractionInTrip: value});
  };

  handleSearch_ = () => {
    this.props.onSubmit();
  };

  clearTextTerm_ = () => {
    this.props.onChange({term: ''});
  };

  render() {
    return (
      <form className="form-container">
        <AutocompleteComponent
            hintText="Start location"
            isCurrentLocation={typeof this.props.origin === 'object'}
            isOrigin={true}
            onChange={this.handleChange_}
            value={typeof this.props.origin === 'object' ?
                'Current Location' : this.props.origin} />
        <AutocompleteComponent
            hintText="Final destination"
            isCurrentLocation={typeof this.props.destination === 'object'}
            onChange={this.handleChange_}
            value={typeof this.props.destination === 'object' ?
                'Current Location' : this.props.destination} />
        <FormTextField
            floatingLabelText="Stop for (e.g. lunch, coffee)..."
            id='Term'
            value={this.props.term}
            onChange={this.handleTermChange_}
            onClickCloseButton={this.clearTextTerm_} />

        <FormSlider
            value={this.props.initialSliderValue}
            onChange={this.handleSliderDragStop_} />
        {/*<FormSlider startValue="Quality" endValue="Distance" /> */}

        <RaisedButton
            label="Go"
            primary={true}
            onClick={this.handleSearch_}
            disabled={this.props.origin == '' || this.props.destination == ''} />
        <a className="yelp-image" href="https://www.yelp.com" target="_blank">
          <img src="https://s3-media2.fl.yelpcdn.com/assets/srv0/developer_pages/95212dafe621/assets/img/yelp-2c.png" />
        </a>
      </form>
    );
  }
};

class AutocompleteComponent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      dataSource: this.getEmptyDataSourceList_(),
    };
  }

  handleUpdateInput_ = (searchText) => {
    this.updateAutocompleteSelectionState_({
      text: searchText,
    });

    if (!searchText) {
      this.setState({
        dataSource: this.getEmptyDataSourceList_(),
      });
      return;
    }

    autocompleteService.getPlacePredictions({
      input: searchText,
    },
    (results) => {
      if (!results) return;

      const dataSourceResults = results.map((result) => {
        return {
          text: result.description,
          value: this.getDataSourceNode_(result.description),
        };
      });
      const finalResults =
          this.getEmptyDataSourceList_().concat(dataSourceResults);
      this.setState({ dataSource: finalResults });
    });
  };

  getEmptyDataSourceList_ = () => {
    return [{
      isCurrentLocation: true,
      text: '',
      value: (
        <MenuItem
            rightIcon={
              <NearMe style={{
                fill: blueGrey600,
                height: '18px',
                marginTop: '14px',
                width: '18px'
              }}/>
            }
            primaryText='Current Location'
            style={{
              color: blueGrey600,
              fontSize: '14px',
              fontWeight: 600,
            }} />
      ),
    }];
  };

  /**
   * @param {string} text
   */
  getDataSourceNode_ = (text) => {
    return (
      <MenuItem 
          primaryText={text}
          style={{
            fontSize: '14px',
          }} />
    );
  };

  filterResults_ = () => {
    // Don't filter results. Always use Google Places Autocomplete results.
    return true;
  };

  handleSelectionChange_ = (dataSource, index) => {
    if (index < 0) return;
    if (dataSource.isCurrentLocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        this.updateAutocompleteSelectionState_({
          currentLocation: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        });
      }, () => {
        alert('Please enable location sharing in your browser.');
        this.clearTextInputState_();
      });

      return;
    }

    this.updateAutocompleteSelectionState_({
      text: dataSource.text,
    });
  };


  clearTextInputState_ = () => {
    this.updateAutocompleteSelectionState_({
      text: '',
    });
  };

  /**
   * Updates app origin or destination state based on selection state.
   * @param {{
   *  currentLocation: (!Object|undefined),
   *  text: (string|undefined),
   * }} selectionState
   */
  updateAutocompleteSelectionState_ = (selectionState) => {
    const location = selectionState.currentLocation ?
        new google.maps.LatLng(
            selectionState.currentLocation.latitude,
            selectionState.currentLocation.longitude) :
        selectionState.text;
    const state = this.props.isOrigin ?
        { origin: location } :
        { destination : location };
    Object.assign(state, {
      isCurrentLocation: selectionState.currentLocation != null,
    });
    this.props.onChange(state);
  };

  render() {
    return (
      <div className="text-field-container">
        <AutoComplete
            dataSource={this.state.dataSource}
            filter={this.filterResults_}
            floatingLabelText={this.props.hintText}
            fullWidth={true}
            inputStyle={{
              color: this.props.isCurrentLocation ? blueGrey600 : 'initial',
              fontWeight: this.props.isCurrentLocation ? 600 : 'initial',
              paddingRight: '36px',
            }}
            maxSearchResults={5}
            onNewRequest={this.handleSelectionChange_}
            onUpdateInput={this.handleUpdateInput_}
            openOnFocus={true}
            searchText={this.props.value} />
        {this.props.value &&
          <IconButton className="text-field-close-button"
              iconStyle={{ height: 18, width: 18 }}
              onClick={this.clearTextInputState_}
              style={{
                bottom: 8,
                height: 36,
                position: 'absolute',
                padding: 8,
                right: 0,
                width: 36
              }}>
            <CloseIcon className="text-field-close-icon" />
          </IconButton>
        }
      </div>
    );
  }
};

/** Text field with customized styling. */
const FormTextField = (props) => (
  <div className="text-field-container">
    <TextField floatingLabelText={props.floatingLabelText}
        inputStyle={{ paddingRight: '36px' }}
        placeholder="" id={props.id}
        style={{ display: 'block', marginTop: '-6px', width: '100%' }}
        onChange={props.onChange}
        value={props.value} />
        {props.value &&
          <IconButton className="text-field-close-button"
              onClick={props.onClickCloseButton}
              iconStyle={{ height: 18, width: 18 }}
              style={{
                bottom: 8,
                height: 36,
                position: 'absolute',
                padding: 8,
                right: 0,
                width: 36
              }}>
            <CloseIcon className="text-field-close-icon" />
          </IconButton>}
  </div>
);

const CloseIcon = (props) => (
  <svg fill="#000000" height="24" viewBox="0 0 24 24" width="24"
      className={props.className}>
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      <path d="M0 0h24v24H0z" fill="none"/>
  </svg>
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

class OnboardingComponent extends React.Component {
  handleOnboarding1_ = () => {
    this.props.onOnboardingSelection({
      origin: 'San Francisco, CA, USA',
      destination: 'Los Angeles, CA, USA',
      stopFractionInTrip: 0.5,
      term: 'lunch',
    });
  };

  handleOnboarding2_ = () => {
    this.props.onOnboardingSelection({
      origin: 'New York City, NY, USA',
      destination: 'Boston, MA, USA',
      stopFractionInTrip: 0.2,
      term: 'coffee',
    });
  };

  render() {
    return (
      <div className="onboarding-container">
        <OnboardingCard image="images/lunch.jpg" title="SF to LA"
            subtitle="Stop for lunch midway"
            onClick={this.handleOnboarding1_} />
        <OnboardingCard image="images/coffee.jpg" title="NYC to Boston" 
            subtitle="Grab coffee towards the start"
            onClick={this.handleOnboarding2_} />
      </div>
    )
  }
};

const OnboardingCard = (props) => (
  <Card className="onboarding-card" onClick={props.onClick}>
    <CardMedia
        overlay={<CardTitle title={props.title} subtitle={props.subtitle} />}>
      <img src={props.image} alt="" />
    </CardMedia>
  </Card>
);

class ResultsComponent extends React.Component {
  handleRowSelection_ = (selectedRows) => {
    if (selectedRows.length > 0) {
      this.props.onRowSelection(selectedRows[0]);
    }
  };

  handleRowHover_ = (rowNumber) => {
    this.props.onRowHover(rowNumber);
  };

  /**
  * Called when a business link is clicked, to open the Yelp business page.
  * @param {!Object} event
  */
  handleLinkClick_ = (event) => {
    // Prevent bubbling up, so that the row is not selected.
    event.stopPropagation();
  };

  render() {
    const resultsClass = this.props.isLoading ?
        'results-container loading' : 'results-container';
    return (
      <div className={resultsClass}>
        {!this.props.isLoading &&
          <OnboardingComponent 
              onOnboardingSelection={this.props.onOnboardingSelection} />}

        {this.props.isLoading &&
          <CircularProgress className="circular-progress"
              style={{display: 'block', margin: '0 auto'}} />}

        <Table
            onRowHover={this.handleRowHover_}
            onRowHoverExit={this.props.onRowHoverExit} 
            onRowSelection={this.handleRowSelection_}
            className="results-table">

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
                        onClick={this.handleLinkClick_}>
                      {result.name}
                    </a>
                  </TableRowColumn>
                  <TableRowColumn
                      style={{paddingLeft: '12px', paddingRight: '12px'}}>
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
};

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
          onClick={props.onDirectionsClick} disabled={props.disabled} />
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
