var webshot = require('webshot');
var multiAppacitive = require('multiappacitive').Appacitive;
var Appacitive = new multiAppacitive();
var MessageProcessor = require('./messageProcessor.js');

this.messageProcessor = new MessageProcessor(this);

console.log("Starting webshot")

Appacitive.initialize({ 
    apikey: "sSfHIv9RZMojN4Ih3MiLYCgdnQuW8RrpRbpDw5IiQfo=", 
    env: "sandbox",
    appId: "57208653680346724"
});

var takeSnapshot = function(bookmark) {

	webshot(bookmark.get('url') , './uploads/' + bookmark.id() + '.png', function(err) {
	  	if (err) {
	  		console.log(err);
	  		return;
	  	}
	  	console.log("Image " + bookmark.id() + ".png saved");

	  	require('fs').readFile('uploads/' + bookmark.id() + '.png', function(err, data) {
	  		
	  		if (err) {
	  			console.log(err);
	  			return;
	  		}

	  		console.log("Image " + bookmark.id() + ".png read from disk");

	  		//create file object
			var file = new Appacitive.File({
				fileId: bookmark.id() +'.png',
			    fileData: data,
			    contentType: 'image/png'
			});

			console.log('file object created for ' + bookmark.id() + '.png');

			// save it on server
			file.save().then(function(url) {
				console.log('file saved on server');

				bookmark.set('screenshot_url', url);
    			
    			bookmark.save().then(function() {
    				console.log("Screenshot url for " + bookmark.id() + ' saved');
    			}, function(err) {
    				console.log(err);
    			});
			}, function(err) {
			   console.log(err);
			});
		});
	});
};

//listen for new message when ready to execute
this.messageProcessor.register('BMSC', function(message) {
	var bookmark = new Appacitive.Object(message.bookmark, true);
	takeSnapshot(bookmark);
});

var that = this;

process.on('message', function(message) {
	console.log("Got message");
	that.messageProcessor.getMessageProcessor(message)();
});

exports.takeSnapshot = takeSnapshot;

/*var bookmark = new Appacitive.Object({
	"__id": "57322455660888345",
	"__type": "bookmark",
	"__createdby": "57209318093752301",
	"__lastmodifiedby": "57209318093752301",
	"__typeid": "57208814085212025",
	"__revision": "1",
	"__tags": [
		"backbone",
		"portal"
	],
	"__utcdatecreated": "2014-04-25T17:15:52.3768000Z",
	"__utclastupdateddate": "2014-04-25T17:15:52.3768000Z",
	"title": "Backbone.js",
	"description": "",
	"url": "http://backbonejs.org/#Model-save",
	"private": "false",
	"screenshot_url": "/images/logo.png",
	"__attributes": {}
});

takeSnapshot(bookmark);*/