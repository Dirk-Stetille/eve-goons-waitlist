//Imports
const express = require('express');
const passport = require('passport');
const app = express();
const OAuth2Strategy = require('passport-oauth2');
const refresh = require('passport-oauth2-refresh');
const bodyParser = require('body-parser');
const request = require('request');
const url = require('url');
const session = require('express-session');

//Custom imports
const setup = require('./setup.js');
const users = require('./users.js')(setup);
const customSSO = require('./customSSO.js')(refresh, setup, request, url);
//Make some globals
var userList = users.createUsersVariable();

//Configure Passport's oAuth
var oauthStrategy = new OAuth2Strategy({
        authorizationURL: `https://${setup.oauth.baseSSOUrl}/oauth/authorize`,
        tokenURL: `https://${setup.oauth.baseSSOUrl}/oauth/token`,
        clientID: setup.oauth.clientID,
        clientSecret: setup.oauth.secretKey,
        callbackURL: setup.oauth.callbackURL
    },
    function(accessToken, refreshToken, profile, done) {
    	console.log("Users access token: " + accessToken);
    	console.log("Users refresh token: " + refreshToken);
    	//Our user has logged in, let's get a unique ID for them (Their character ID, because why not)
    	customSSO.verifyReturnCharacterDetails(refreshToken, function(success, response, characterDetails) {
    		if (success) {
    			users.findOrCreateUser(users, refreshToken, characterDetails, function(user) {
    				done(null, user);
    			})
    			
    		} else {
    			console.log("Character ID request failed for token " + refreshToken);
    			done(success);
    		}
    	});
    });

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

//Extend some stuff
passport.use('provider', oauthStrategy);
refresh.use('provider', oauthStrategy);
app.use(session({secret: "4ATmaVuEn8BA5HXMyf6yMKu3BcstonoQrbxkzVe0A6aP3FjTggvDdMhYme40"}));
app.use(passport.initialize());
app.use(passport.session());
app.use( bodyParser.urlencoded({ extended: true }) );
app.use('/static', express.static('public'));

//Routes
require('./oAuthRoutes.js')(app, passport, setup);
require('./routes.js')(app, setup);

//Configure Express webserver
app.listen(setup.settings.port, function listening() {
    console.log('Express online and accepting connections');
});
