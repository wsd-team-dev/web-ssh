const path = require ( 'path' );
const http = require ( 'http' );
const express = require ( 'express' );
const hbs = require ( 'express-handlebars' );
const app = express ();

const configService = require ( './services/config' );
const config = configService.decorateAppConfig( require ( './settings/app.json' ) );
const terminal = require ( './services/terminal' ) ( config );
const token = require ( './services/token' ) ( config );

app.engine ( 'handlebars', hbs ( { defaultLayout: 'main' } ) );
app.set ( 'view engine', 'handlebars' );

// Index page
app.get ( '/', ( req, res ) => res.render ( 'index', {
	layout : false,
	config : config,
} ) );

// Static files
app.use ( '/', express.static ( path.join ( __dirname, 'public' ) ) );

// Request new terminal
app.get ( '/open/:id', terminal );

// Generate token
app.get ( '/token/:id', token );

// Create server
http.createServer ( app ).listen ( config.app_port, function () {
	console.log ( 'App server listening on: http://localhost:' + config.app_port );
} );