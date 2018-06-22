import IconButton from 'material-ui/IconButton';
import React from 'react';
import TextField from 'material-ui/TextField';

/** Text field with customized styling. */
const FormTextField = (props) => {
  const inputProps = Object.assign({}, props);
  delete inputProps.isCurrentLocation;
  delete inputProps.onClickCloseButton;

  return (
    <div className="text-field-container">
      <TextField
          {...inputProps}
          inputStyle={{
            color: props.isCurrentLocation ? blueGrey600 : 'initial',
            paddingRight: '36px',
          }}
          placeholder=""
          style={{ display: 'block', marginTop: '-6px', width: '100%' }} />
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
};

const CloseIcon = (props) => (
  <svg fill="#000000" height="24" viewBox="0 0 24 24" width="24"
      className={props.className}>
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      <path d="M0 0h24v24H0z" fill="none"/>
  </svg>
);

export default FormTextField;
