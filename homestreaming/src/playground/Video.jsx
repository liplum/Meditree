import React from 'react'

export class VideoPlayer extends React.Component {

  render() {
    return (<video controls src={this.props.url} {...this.props} />)
  }
}