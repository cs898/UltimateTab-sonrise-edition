import React from 'react'

function Error({ statusCode }) {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>An error occurred</h1>
      <p>
        {statusCode
          ? `An error ${statusCode} occurred on server`
          : 'An error occurred on client'}
      </p>
      <p>Please try refreshing or check the application logs.</p>
    </div>
  )
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
