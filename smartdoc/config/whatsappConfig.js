const client = require('twilio')(accountSid, authToken);

client.messages
    .create({
        from: 'whatsapp:+14155238886',
        contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
        contentVariables: '{"1":"12/6","2":"3pm"}',
        to: 'whatsapp:+2349030894433'
    })
    .then(message => console.log(message.sid))
    .done();