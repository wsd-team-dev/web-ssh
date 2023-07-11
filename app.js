import path from 'path';
import http from 'http';
import express from 'express';
import { engine as hbs } from 'express-handlebars';
const app = express ();

import configService from './services/config.js';
import appConfig from './settings/app.json' assert { type: 'json' };

import terminal from './services/terminal.js';
import token from './services/token.js';
import assetRegisterService from './services/asset-register.js';

global.config = appConfig;

const terminalInstance = terminal(config);
const tokenInstance = token(config);
const assetRegisterInstance = assetRegisterService(config);

app.engine ( 'handlebars', hbs (
    {
        defaultLayout: 'main',
        helpers      : {
            json: c => JSON.stringify ( c, null, 4 )
        }
    }
) );
app.set ( 'view engine', 'handlebars' );

// Index page
app.get ( '/', async ( req, res ) => {

    // Check asset register
    if ( config.enable_asset_register !== false ) {
        // Get asset register hosts
        const assetHostsGroup = await assetRegisterInstance.getHosts ();
        // Update hosts
        config.hosts[ 0 ] = {
            ...config.hosts[ 0 ],
            ...assetHostsGroup
        };
    }

    // Decorate updated configs
    if ( !global.config.decorated ) {
        global.config = configService.decorateAppConfig ( global.config );
    }

    // Serve the view
    return res.render ( 'index', {
        layout: false,
        config: config
    } );

} );

// Static files
app.use ( '/', express.static ( 'public' ) );

// Request new terminal
app.get ( '/open/:id', terminalInstance );

// Generate token
app.get ( '/token/:id', tokenInstance );

// Create server
http.createServer ( app )
    .listen ( config.app_port, function () {
        console.log ( 'App server listening on: http://localhost:' + config.app_port );
    } );