import AutocompleteComponent from './autocomplete.jsx';
import FormTextField from './formtextfield.jsx';
import RaisedButton from 'material-ui/RaisedButton';
import React from 'react';
import Slider from 'material-ui/Slider';

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
            floatingLabelText="Start location"
            id='origin'
            isCurrentLocation={typeof this.props.origin === 'object'}
            isOrigin={true}
            onChange={this.handleChange_}
            value={typeof this.props.origin === 'object' ?
                'Current Location' : this.props.origin} />
        <AutocompleteComponent
            floatingLabelText="Final destination"
            id='destination'
            isCurrentLocation={typeof this.props.destination === 'object'}
            onChange={this.handleChange_}
            value={typeof this.props.destination === 'object' ?
                'Current Location' : this.props.destination} />
        <FormTextField
            floatingLabelText="Stop for (e.g. lunch, coffee)..."
            id='term'
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

/** Slider with customized styling. */
const FormSlider = (props) => (
  <div className="slider-container">
    <div className="slider-header">Stop Distance into Trip</div>
    <Slider value={props.value} style={{ width: '100%' }} 
        sliderStyle={{ marginTop: '14px', marginBottom: '16px' }}
        onChange={props.onChange} />
  </div>
);

export default FormComponent;
