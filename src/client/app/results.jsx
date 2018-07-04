import CircularProgress from 'material-ui/CircularProgress';
import React from 'react';
import {Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn} from 'material-ui/Table';

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
    return (
      <div className="results-table-container">
        {this.props.isLoading &&
          <CircularProgress className="circular-progress"
              style={{display: 'block', margin: '12px auto'}} />}
        {this.props.results.length == 0 &&
          <div className="empty-results-container">
            No results yet...
            <div className="map-emoji">🗺️</div>
          </div>
        }

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
                    <img src={yelpStarImgUrl(result.rating)}
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

function yelpStarImgUrl(rating) {
  const baseUrl = 'images/yelpStars/';
  switch (rating) {
    case 5:
      return baseUrl + 'regular_5.png'
    case 4.5:
      return baseUrl + 'regular_4_half.png'
    case 4:
      return baseUrl + 'regular_4.png'
    case 3.5:
      return baseUrl + 'regular_3_half.png'
    case 3:
      return baseUrl + 'regular_3.png'
    case 2.5:
      return baseUrl + 'regular_2_half.png'
    case 2:
      return baseUrl + 'regular_2.png'
    case 1.5:
      return baseUrl + 'regular_1_half.png'
    case 1:
      return baseUrl + 'regular_1.png'
    case 0.5:
      return baseUrl + 'regular_0_half.png'
    default:
      return baseUrl + 'regular_0.png'
  }
}

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

export default ResultsComponent;