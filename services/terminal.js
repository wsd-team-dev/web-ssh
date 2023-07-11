import express from 'express';
import http from 'http';
import https from 'https';
import { Server as server } from "socket.io";
import pty from 'node-pty';

export default ( config ) => ( req, res ) => {

	let config_id = req.params.id;
	let opts = config._index[ config_id ];

	// stop on invalid ID
	if( !opts ) {
		res.status( 400 ).json({error: 'Invalid ID'});
	}

	process.on('uncaughtException', function(e) {
		console.error('Error: ' + e);
	});

	let httpserv;

	let app = express();

	if (opts.https) {
		httpserv = https.createServer(opts.ssl, app).listen(opts.port, function() {
			console.log('Terminal listening on: https://localhost:' + opts.port);
		});
	} else {
		httpserv = http.createServer(app).listen(opts.port, function() {
			console.log('Terminal listening on: http://localhost:' + opts.port);
		});
	}

	let io = new server(httpserv,{
        path: '/js/socket.io',
        cors: {
            origin: '*'
        }
    });

	io.on('connection', function(socket){
		let sshuser = '';
		let request = socket.request;
		console.log((new Date()) + ' Connection accepted.');
        let match = request.headers.referer.match('/wetty/ssh/.+$');
		if (match) {
			sshuser = match[0].replace('/wetty/ssh/', '') + '@';
		} else if (opts.sshuser) {
			sshuser = opts.sshuser + '@';
		}

		let term;
		if (process.getuid() == 0) {
			term = pty.spawn('/usr/bin/env', ['login'], {
				name: 'xterm-256color',
				cols: 80,
				rows: 30
			});
		} else {
			term = pty.spawn('ssh', [sshuser + opts.sshhost, '-p', opts.sshport, '-o', 'PreferredAuthentications=' + opts.sshauth], {
				name: 'xterm-256color',
				cols: 80,
				rows: 30
			});
		}
		console.log((new Date()) + " PID=" + term.pid + " STARTED on behalf of user=" + opts.sshuser);
		term.on('data', function(data) {
			socket.emit('output', data);
		});
		term.on('exit', function(code) {
			console.log((new Date()) + " PID=" + term.pid + " ENDED");
			socket.disconnect();
		});
		socket.on('resize', function(data) {
			term.resize(data.col, data.row);
		});
		socket.on('input', function(data) {
			term.write(data);
		});
		socket.on('disconnect', function() {
			term.end();
		});
	});

	res.json( {
		response: 'OK',
		config: opts
	} );

};