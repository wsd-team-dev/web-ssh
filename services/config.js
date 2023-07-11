'use strict';

/*
* Parse/process server arguments
*
* Options:
  --sslkey    path to SSL key
  --sslcert   path to SSL certificate
  --sshhost   ssh server host
  --sshport   ssh server port
  --sshuser   ssh user
  --sshauth   defaults to "password", you can use "publickey,password" instead
  --port, -p  wetty listen port                                                 [required]
*
* */

import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';

const _default = {
	"https"  : false,
	"sslkey" : null,
	"sslcert": null,
	"sshhost": null,
	"sshuser": null,
	"sshauth": 'publickey,password,keyboard-interactive'
};

let configLoader = {

	// process terminal config
	decorateTerminalConfig: ( terminalCnf, globalCnf ) => {

		// merge with defaults
		let cnf = _.merge ( terminalCnf, _default );

		// check for ssl certs
		if ( cnf.sslkey && cnf.sslcert ) {
			cnf.https = true;
			cnf.ssl = {};
			cnf.ssl[ 'key' ] = fs.readFileSync ( path.resolve ( cnf.sslkey ) );
			cnf.ssl[ 'cert' ] = fs.readFileSync ( path.resolve ( cnf.sslcert ) );
		}

		if ( !cnf.cmd ) {
			console.warn( 'cmd config property expected!', cnf.cmd );
		}

		// look for ssh user/ip combo
		let cstr = cnf.cmd.match ( /(\w+)\@(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i );
        let cport = cnf.cmd.match ( /\-p (\d+)/i ) || [];

		// append if missing from config
		cnf.sshhost = cnf.sshhost || cstr[ 2 ];
		cnf.sshuser = cnf.sshuser || cstr[ 1 ];
		cnf.sshauth = 'publickey';
		cnf.sshport = cnf.sshport || cport[1] || 22;
		cnf.id = uuid();

		let sc = cnf.shortcuts;
		cnf.shortcuts = {};

		// localise shortcuts
		if( sc ) {
			_.each( sc, ( cutid ) => cnf.shortcuts[ cutid ] = globalCnf.shortcuts[ cutid ] );
		}

		// return processed config object
		return cnf;

	},

	// process app config - (supports shuttle config file)
	decorateAppConfig: ( cnf ) => {

		// socket port
		let port = cnf.cli_port_start;

		// for quick lookup by id
		cnf._index = {};

		_.each ( cnf.hosts, dir => {

			_.each ( dir, ( group ) => {

				_.each ( group, ( terminalCnf ) => {

					terminalCnf.port = ++port;

					terminalCnf = configLoader.decorateTerminalConfig( terminalCnf, cnf );

					cnf._index[ terminalCnf.id ] = terminalCnf;

				} );

			} );

		} );

        // Don't decorate it twice
        cnf.decorated = true;

		return cnf;

	}

};

export default configLoader;