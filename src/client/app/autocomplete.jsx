import Autosuggest from 'react-autosuggest';
import FormTextField from './formtextfield.jsx';
import NearMe from 'material-ui/svg-icons/maps/near-me';
import Paper from 'material-ui/Paper';
import React from 'react';
import {MenuItem} from 'material-ui/Menu';
import {blueGrey600} from 'material-ui/styles/colors';

const autocompleteService = new google.maps.places.AutocompleteService();

class AutocompleteComponent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      suggestions: this.getEmptySuggestionsList_(),
    };

    this.MAX_RESULTS = 5;
  }

  handleSuggestionsFetchRequested_ = ({ value }) => {
    this.updateAutocompleteSelectionState_({
      text: value,
    });

    if (!value) {
      this.setState({
        suggestions: this.getEmptySuggestionsList_(),
      });
      return;
    }

    autocompleteService.getPlacePredictions({
      input: value,
    },
    (results) => {
      if (!results) return;

      const placePredictions = results.map((result) => {
        return {
          text: result.description,
        };
      });
      const finalSuggestions =
          placePredictions
              .slice(0, this.MAX_RESULTS - 1)
              .concat(this.getEmptySuggestionsList_());
      this.setState({ suggestions: finalSuggestions });
    });
  };

  getEmptySuggestionsList_ = () => {
    return [{
      isCurrentLocation: true,
      text: '',
    }];
  };

  handleSelectionSelected_ = (suggestion, suggestionValue) => {
    if (suggestionValue.suggestion.isCurrentLocation) {
      $.ajax({
        context: this,
        error: () => {
          alert('Could not detect current location.');
          this.clearInputState_();
        },
        type: 'POST',
        url: 'https://www.googleapis.com/geolocation/v1/geolocate?key=AIzaSyCW5ncOHTYAkqoTTN4Uu8rW2Vxgnxo82O4', 
        success: (response) => {
          this.updateAutocompleteSelectionState_({
            currentLocation: {
              latitude: response.location.lat,
              longitude: response.location.lng,
            },
          });
        }
      });

      return;
    }

    this.updateAutocompleteSelectionState_({
      text: suggestionValue.suggestion.text,
    });
  };

  onSuggestionsClearRequested_ = () => {
    this.setState({
      suggestions: this.getEmptySuggestionsList_(),
    });
  };

  clearInputState_ = () => {
    this.updateAutocompleteSelectionState_({
      text: '',
    });
  };

  getSuggestionValue_ = (suggestion) => {
    return suggestion.isCurrentLocation ? 'Current Location' : suggestion.text;
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

  renderInput_ = (inputProps) => {
    return (
      <FormTextField
          {...inputProps}
          onClickCloseButton={this.clearInputState_} />
    );
  }

  renderSuggestionsContainer_ = (options) => {
    const { containerProps, children } = options;
    return (
      <Paper {...containerProps}>
        {children}
      </Paper>
    );
  };

  shouldRenderSuggestions_ = (value) => {
    // Always render suggestions regardless of value length.
    return true;
  };

  handleTextInputChange_ = (event, {newValue}) => {
    this.updateAutocompleteSelectionState_({
      text: newValue,
    });
  };

  render() {
    return (
        <Autosuggest
            focusInputOnSuggestionClick={false}
            getSuggestionValue={this.getSuggestionValue_}
            inputProps={{
              floatingLabelText: this.props.floatingLabelText,
              id: this.props.id,
              isCurrentLocation: this.props.isCurrentLocation,
              onChange: this.handleTextInputChange_,
              value: this.props.value,
            }}
            onSuggestionsClearRequested={this.onSuggestionsClearRequested_}
            onSuggestionSelected={this.handleSelectionSelected_}
            onSuggestionsFetchRequested={this.handleSuggestionsFetchRequested_}
            renderInputComponent={this.renderInput_}
            renderSuggestion={renderSuggestion}
            renderSuggestionsContainer={this.renderSuggestionsContainer_}
            shouldRenderSuggestions={this.shouldRenderSuggestions_}
            suggestions={this.state.suggestions} />
    );
  }
};

/**
 * Must be a pure function due to Autosuggest optimization.
 */
const renderSuggestion = (suggestion, { query, isHighlighted }) => {
  return suggestion.isCurrentLocation ? (
    <MenuItem
        rightIcon={
          <NearMe style={{
            fill: blueGrey600,
            height: '18px',
            marginTop: '14px',
            width: '18px'
          }}/>
        }
        style={{
          backgroundColor: isHighlighted ? 'rgba(0,0,0,0.1)' : 'initial',
          color: blueGrey600,
          fontSize: '14px',
          fontWeight: 600,
        }}>
      <div>Current Location</div>
    </MenuItem>
  ) : (

    <MenuItem 
        style={{
          backgroundColor: isHighlighted ? 'rgba(0,0,0,0.1)' : 'initial',
          fontSize: '14px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
      <div>{suggestion.text}</div>
    </MenuItem>
  );
};

export default AutocompleteComponent;
