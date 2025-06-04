const response = await fetch('http://localhost:8080/api/send-message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '+2349030894433',
    message: 'Your appointment reminder',
    templateData: {
      contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
      variables: { "1": "12/6", "2": "3pm" }
    }
  })
});