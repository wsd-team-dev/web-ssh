'use strict';

/*
	App controller
 */

(function ( $ ) {

	let App = {

		// DOM Nodes
		Dom: {
			Sidebar  : $ ( '#sidebar' ),
			Search   : $ ( '#search' ),
			Terminals: {}
		},

		// sockets ref
		sockets: {},

		// configs ref
		configs: {},

		// Init routine
		init: function () {

			var self = this;

			jQuery.expr[ ':' ].icontains = function ( a, i, m ) {
				return jQuery ( a ).text ().toUpperCase ()
					.indexOf ( m[ 3 ].toUpperCase () ) >= 0;
			};

			// search
			$ ( '#search' ).on ( 'keyup', ( e ) => {
				let val = $ ( '#search' ).val ();
				if ( val.length > 2 ) {
					$ ( '.side-nav' ).addClass ( 'searching' );
					$ ( '.side-nav ul li ul a.collapsible-header' ).addClass ( 'hide' );
					$ ( '.side-nav ul li ul a.collapsible-header:icontains("' + val + '")' ).removeClass ( 'hide' );
				} else {
					$ ( '.side-nav' ).removeClass ( 'searching' );
					$ ( '.side-nav ul li ul a.hide' ).removeClass ( 'hide' );
				}

			} );

			// when clicking on a terminal link
			$ ( '.connect' ).on ( 'click', function ( e ) {

				$ ( 'main .intro' ).remove ();

				let ID = $ ( this ).data ( 'configId' );

				// Mark as active
				$ ( '.connect.selected' ).removeClass( 'selected' );
				$ ( this ).addClass ( 'selected' );

				if ( $ ( this ).hasClass ( 'connected' ) ) {

					// stop hide/show of quick commands - it can be annoying
					e.preventDefault();

					// Already connected
					$ ( 'main .terminal' ).hide ();
					$ ( '#' + ID ).show ();

				} else {

					// if disconnected node exist in dom remove it
					$ ( '#' + ID ).remove ();

					$ ( 'main .terminal' ).hide ();

					// Append terminal container
					$ ( 'main' ).append ( '<div class="terminal" id="' + ID + '"></div>' );

					// create new connection
					$.get ( "/open/" + ID, function ( data ) {

						console.log ( data );

						$ ( 'body' ).append ( `<script src="http://localhost:${data.config.port}/js/socket.io/socket.io.js">` );

						setTimeout ( ( config ) => { App.createTerminal ( config ) }, 100, data.config );

					} );

				}

			} );

			// when clicking on a shortcut link
			$ ( '.shortcut' ).on ( 'click', function ( e ) {

				let configID = $ ( this ).parents ( '.connect' ).data ( 'configId' );
				let shortcutID = $ ( this ).data( 'shortcutId' );

				let commands = App.configs[ configID ].shortcuts[ shortcutID ].commands;

				$( commands ).each( (v, k) => {
					App.sockets[ configID ].emit ( 'input', k + "\n" );
				})

			} );

		},

		createTerminal: function ( config ) {

			let term;
			let buf = '';
			let _id = config.id;
			let socket = io ( 'http://localhost:' + config.port, { path: '/js/socket.io' } );

			// store a copy
			App.sockets[ config.id ] = socket;
			App.configs[ config.id ] = config;

			function Wetty ( argv ) {
				this.argv_ = argv;
				this.io = null;
				this.pid_ = -1;
			}

			Wetty.prototype.run = function () {
				this.io = this.argv_.io.push ();

				this.io.onVTKeystroke = this.sendString_.bind ( this );
				this.io.sendString = this.sendString_.bind ( this );
				this.io.onTerminalResize = this.onTerminalResize.bind ( this );
			};

			Wetty.prototype.sendString_ = function ( str ) {
				socket.emit ( 'input', str );
			};

			Wetty.prototype.onTerminalResize = function ( col, row ) {
				socket.emit ( 'resize', { col: col, row: row } );
			};

			socket.on ( 'connect', function () {
				$ ( '.connect[data-config-id="' + _id + '"]' ).addClass ( 'connected' );
				lib.init ( function () {
					hterm.defaultStorage = new lib.Storage.Local ();
					term = new hterm.Terminal ();
					window.term = term;
					term.decorate ( document.getElementById ( _id ) );

					term.setCursorPosition ( 0, 0 );
					term.setCursorVisible ( true );
					term.prefs_.set ( 'ctrl-c-copy', true );
					term.prefs_.set ( 'ctrl-v-paste', true );
					term.prefs_.set ( 'use-default-window-copy', true );

					term.runCommandClass ( Wetty, document.location.hash.substr ( 1 ) );
					socket.emit ( 'resize', {
						col: term.screenSize.width,
						row: term.screenSize.height
					} );

					if ( buf && buf != '' ) {
						term.io.writeUTF16 ( buf );
						buf = '';
					}
				} );
			} );

			socket.on ( 'output', function ( data ) {
				if ( !term ) {
					buf += data;
					return;
				}
				term.io.writeUTF16 ( data );
			} );

			socket.on ( 'disconnect', function () {
				console.log ( "Socket.io connection closed" );
				delete App.sockets[ config.id ];
				$ ( '.connect[data-config-id="' + _id + '"]' ).removeClass ( 'connected' );
			} );

		}

	};

	// Init app module
	App.init ();

	window.App = App;

}) ( jQuery );