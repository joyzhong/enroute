import {Card, CardActions, CardMedia, CardTitle} from 'material-ui/Card';
import React from 'react';

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

export default OnboardingComponent;
