/**
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

var bodyParser = require('body-parser');
var express = require('express');
var request = require('request');
var app = express();

const WIT_TOKEN = "U5C43P5A3E3L7KUFQ5RTVJ7ZOU33D5NE";

//const Wit = require('./wit').Wit;
const Wit = require('node-wit').Wit;
const uuid = require('node-uuid');

app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'));

app.use(bodyParser.json());

app.get('/', function(req, res) {
  console.log(req);
  res.send('It works on heroku!');
});

app.get(['/facebook', '/instagram'], function(req, res) {
  if (
    req.param('hub.mode') == 'subscribe' &&
    req.param('hub.verify_token') == 'token'
  ) {
    res.send(req.param('hub.challenge'));
  } else {
    res.sendStatus(400);
  }
});

app.post('/facebook', function(req, res) {
  console.log('Facebook request body:');
  console.log(req.body);
  // Process the Facebook updates here
  res.sendStatus(200);
});

app.post('/instagram', function(req, res) {
  console.log('Instagram request body:');
  console.log(req.body);
  // Process the Instagram updates here
  res.sendStatus(200);
});

app.get('/webhook', function (req, res) {
  if (req.query['hub.verify_token'] === "this_is_my_secret_token") {
    res.send(req.query['hub.challenge']);
  } else {
    res.send('Error, wrong validation token');    
  }
});

app.post('/webhook', function (req, res) {
  messaging_events = req.body.entry[0].messaging;
  for (i = 0; i < messaging_events.length; i++) {
    event = req.body.entry[0].messaging[i];
    sender = event.sender.id;
    if (event.message && event.message.text) {
      text = event.message.text;
      console.log("content of text: ", text);
        if (text === 'Generic') {
          sendGenericMessage(sender);
          continue;
        }
    //  sendTextMessage(sender, "Text received, echo: "+ text.substring(0, 200));
      const sessionId = findOrCreateSession(sender);
      wit.runActions(sessionId, text, sessions[sessionId].context, (error, context) => {
      if (error) console.log(error);
  });
    }
    if (event.postback) {
      text = JSON.stringify(event.postback);
      sendTextMessage(sender, "Postback received: "+text.substring(0, 200), token);
      continue;
    }
  }
  res.sendStatus(200);
});


var token = "CAASpSd5hpYABACNJt4HiDoOPEFl4Eib3s0c8O3NcPDZBZCNlesHYTUP49gjvAR0gJszjzt1iD8CF96T2ixHv1XPZCdQURNFDmNub1u0v0f6VF8u301nnLOY890hSIrbnXZCjZByhRyiSu5A4XR01RYOYPRV6cELyFY2FqJqnkHQSEyJTRFM2oYbvI1rmA4eIZD";

function sendTextMessage(sender, text) {
  messageData = {
    text:text
  }
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:token},
    method: 'POST',
    json: {
      recipient: {id:sender},
      message: messageData,
    }
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending message: ', error);
    } else if (response.body.error) {
      console.log('Error: ', response.body.error);
    }
  });
}

function sendGenericMessage(sender) {
  messageData = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": [{
          "title": "First card",
          "subtitle": "Element #1 of an hscroll",
          "image_url": "http://messengerdemo.parseapp.com/img/rift.png",
          "buttons": [{
            "type": "web_url",
            "url": "https://www.messenger.com/",
            "title": "Web url"
          }, {
            "type": "postback",
            "title": "Postback",
            "payload": "Payload for first element in a generic bubble",
          }],
        },{
          "title": "Second card",
          "subtitle": "Element #2 of an hscroll",
          "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
          "buttons": [{
            "type": "postback",
            "title": "Postback",
            "payload": "Payload for second element in a generic bubble",
          }],
        }]
      }
    }
  };
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:token},
    method: 'POST',
    json: {
      recipient: {id:sender},
      message: messageData,
    }
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending message: ', error);
    } else if (response.body.error) {
      console.log('Error: ', response.body.error);
    }
  });
}

app.listen();



const HERE = {
  id:"xqatBOxmf61Jv8AzLoS9",
  code: "EopBF0eLNTAcVNzo297DDA",
}

const currentLocation = { //Fort Mason
  Latitude: 37.80524,
  Longitude: -122.42818
}

const sessions = {};

const actions = {
  say: (sessionId, msg, cb) => {
    const recipient = sessions[sessionId].fbid;
    if (recipient) {
    	sendTextMessage(recipient, msg); 
        cb();
    } else {
      cb();
    }
  },
  merge: (context, entities, cb) => {
    const elocation = firstEntityValue(entities, 'location');
    const emode = firstEntityValue(entities, 'mode');
    if (elocation) context.location = elocation;
    if (emode) context.mode = emode;
    cb(context);
  },
  fetchTraffic: (context, cb) => {
    // Here should go the api call, e.g.:
    getTraffic(context.location,context.mode,(time,error) => {
      context.travel_time = time;
      cb(context);
    });
  },
  error: (sessionId, msg) => {
    const recipient = sessions[sessionId].fbid;
    if (recipient) {
    	sendTextMessage(recipient, 'Oops, I don\'t know what to do.');
    }
  },
};

const wit = new Wit(WIT_TOKEN, actions);

const findOrCreateSession = (fbid) => {
  var sessionId;
  for (const key in sessions) {
    if (sessions.hasOwnProperty(key)) {
      if (sessions[key].fbid == fbid) {
        sessionId = key;
        break;
      }
    }
  }
  if (!sessionId) {
    sessionId = uuid.v1();
    sessions[sessionId] = { fbid: fbid, context: {}};
  }
  return sessionId;
};

const firstEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value
  ;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};

const getGeoLoc = (location, callback) => {
	if(location === undefined)
		callback(undefined, "no location captured");
	else {
		request({
		    url: 'https://geocoder.cit.api.here.com/6.2/geocode.json',
		    qs: {app_id: HERE.id,
		    	 app_code: HERE.code,
		    	 gen:9,
		    	 city: 'San Francisco',
		    	 searchText: location.replace(/ /g, '+')},
		    	 method: 'GET',
		    	 json: true,
		}, function(error, response, body){
		    if(error) {
		        callback(undefined, error);
		    } else {
		        callback(body.Response.View[0].Result[0].Location.DisplayPosition);

		    }
		});
	}
}

const getTravelTime = (from, to, mode, callback) => {
	var traffic_mode = mode
	if (mode === undefined) {
		traffic_mode = "car";
	}
	request({
	    url: 'https://route.cit.api.here.com/routing/7.2/calculateroute.json',
	    qs: {app_id: HERE.id,
	    	 app_code: HERE.code,
	    	 mode: "fastest;"+traffic_mode+";traffic:enabled",
	    	 waypoint0: "geo!"+ from.Latitude + ','+ from.Longitude,
	    	 waypoint1: "geo!"+ to.Latitude + ','+ to.Longitude},
	    	 method: 'GET',
	   		 json: true,
	}, function(error, response, body){
	    if(error) {
	       	callback(undefined, error);
	    } else {
	    	if(body.response)
	        	callback(body.response.route[0].summary.travelTime);
	        else
	        	callback(undefined,JSON.stringify(body));		
	    }
	});
}

const getTraffic = (destination, mode, callback) => {
	getGeoLoc(destination,(displayPosition,error)=> {
		if(!error)
			getTravelTime(currentLocation,displayPosition, mode,(travelTime,error) => {
				if(!error) {
					//console.log('It will take ' + Math.ceil(trafficTime/60) + 'min to go to ' + destination)
					callback(Math.ceil(travelTime/60));
				}
				else
					callback(undefined, error);
			});
		else
			callback(undefined, error);
	});
}

