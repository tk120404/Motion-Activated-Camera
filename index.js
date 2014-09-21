
// Node requires
var https = require('https'),
    crypto = require('crypto'),
    bound = require('crypto').pseudoRandomBytes(16).toString('hex'),
    ctype = 'multipart/form-data; boundary=' + bound,
    location = 'Bangalore, @jsfooindia, @arjunkumartk';


var tessel = require('tessel'),
    PIR = tessel.port['GPIO'].pin['G3'],
    camera = require('camera-vc0706').use(
      tessel.port['A'], {
      compression: 0.8,
      resolution: 'qqvga'
  });


// Tweeting as @TesselTweet
var oauth_consumer_key = "O7oc0pvsZn4xjgcuHuYdX4FaC",
    oauth_consumer_secret = "iJYuHFz2sD46Nvk3mcwzX8uih14aEAMgVWdWoR59nx8v6Zl7ZX",
    oauth_access_token = "2529232909-luARGU89K4CKFMvfzBjCgG6ubefzDkdDWkSB85i",
    oauth_access_secret = "GXQfuzvGdjLEs3t1HEYfhQ9x9bdBcSBVXjBkbRgwYlOE0";

// Get time
var curtime = parseInt(process.env.DEPLOY_TIMESTAMP || Date.now());

// Set up OAuth
var oauth_data = {
    oauth_consumer_key: oauth_consumer_key,
    oauth_nonce: crypto.pseudoRandomBytes(32).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(curtime / 1000),
    oauth_token: oauth_access_token,
    oauth_version: '1.0'
};

var out = [].concat(
    ['POST', 'https://api.twitter.com/1.1/statuses/update_with_media.json'],
    (Object.keys(oauth_data).sort().map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(oauth_data[k]);
    }).join('&'))
).map(encodeURIComponent).join('&');

oauth_data.oauth_signature = crypto
  .createHmac('sha1', [oauth_consumer_secret, oauth_access_secret].join('&'))
  .update(out)
  .digest('base64');

var auth_header = 'OAuth ' + Object.keys(oauth_data).sort().map(function (key) {
    return key + '="' + encodeURIComponent(oauth_data[key]) + '"';
}).join(', ');

function post (status, file) {
    var req = https.request({
        port: 443,
        method: 'POST',
        hostname: 'api.twitter.com',
        path: '/1.1/statuses/update_with_media.json',
        headers: {
            Host: 'api.twitter.com',
            'Accept': '*/*',
            "User-Agent": "tessel",
            'Authorization': auth_header,
            'Content-Type': ctype,
            'Connection': 'keep-alive'
        }
    }, function (res) {
      console.log("statusCode: ", res.statusCode);
      console.log("headers: ", res.headers);

      res.on('data', function(d) {
        console.log(' ');
        console.log(' ');
        console.log(String(d));
      });
    });

    req.write('--' + bound + '\r\n');
    req.write('Content-Disposition: form-data; name="status"\r\n');
    req.write('\r\n');
    req.write(status + '\r\n');
    req.write('--' + bound + '\r\n');
    req.write('Content-Type: application/octet-stream\r\n');
    req.write('Content-Disposition: form-data; name="media[]"; filename="jsfoo.jpg"\r\n');
    req.write('\r\n');
    req.write(file);
    req.write('\r\n');
    req.write('--' + bound + '--\r\n');
    req.end();

    req.on('error', function(e) {
      console.error(e);
    });
}



console.log('Connecting camera...');
camera.on('ready', function () {
  // Wait for motion
  PIR.on('rise', function(time) {
    console.log('Motion detected! Taking picture...');
    // Take a picture
    camera.takePicture(function(err, image) {
      if (err) {
        console.log('Error taking picture:', err);
      } else {
        console.log('Picture taken. Saving...');
        // Name the image for the time it was taken
        var name = 'picture-' + time + '.jpg';
        // Save
        //  process.sendfile(name, image);
        post('Tweeting from @technicalhumans #tesselcam! #PIR for #JSFOO' + location, image);
        console.log('Picture saved.');
      }
    });
  });
});

camera.on('error', function (err) {
  console.log('Error: ', err);
});