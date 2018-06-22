import FlatButton from 'material-ui/FlatButton';
import IconButton from 'material-ui/IconButton';
import MapsDirections from 'material-ui/svg-icons/maps/directions';
import NavigationArrowBack from 'material-ui/svg-icons/navigation/arrow-back';
import React from 'react';

const MapComponent = (props) => (
  <div className="map-container">
    <div className="map-header-container">
      <div className="back-button-container">
        <IconButton onClick={props.onBackButtonClick}>
          <NavigationArrowBack />
        </IconButton>
      </div>
      <FlatButton label="Directions" secondary={true}
          onClick={props.onDirectionsClick} disabled={props.disabled} />
    </div>

    <div className="map-iframe-container" id="map">
      // Map is inserted here.
    </div>

    <div className="directions-icon-container">
      <IconButton
          disabled={props.disabled}
          onClick={props.onDirectionsClick}
          style={{ marginLeft: '8px' }}
          tooltip="Directions">
        <MapsDirections
            hoverColor={props.directionsIconHoverColor} />
      </IconButton>
    </div>
  </div>
);

export default MapComponent;
