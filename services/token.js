const jwt = require ( 'jsonwebtoken' );
const fetch = require ( 'node-fetch' );
const querystring = require ( 'querystring' );

const _cfg = {
	"jwt_secret"    : "C15nHbE8i62ftaVb1xGYM0R97r79Y819",
	"jwt_audience"  : "priipcloud.com",
	"jwt_algorithm" : "HS256",
	"jwt_expiration": "1 day",
};

const getJWTToken = ( config ) => {

	// Create new token
	return jwt.sign (
		{
			iss : config.client_id,
			sub : config.user_id,
			aud : _cfg.jwt_audience,
			data: {}
		},
		_cfg.jwt_secret,
		{
			algorithm: _cfg.jwt_algorithm,
			jwtid    : require ( 'uuid' ).v4 (),
			expiresIn: _cfg.jwt_expiration
		}
	);

};

const getBearerToken = ( config ) => {

	let body = querystring.stringify ( {
		grant_type: 'password',
		username  : config.username,
		password  : config.password
	} );

	return fetch (
		config.host + 'oauth/token',
		{
			method : 'POST',
			headers: {
				'Authorization': `Basic ${config.auth}`,
				'Content-Type' : 'application/x-www-form-urlencoded'
			},
			body   : body
		}
	)
		.then ( r => r.json () )
		.catch ( e => console.error(e) );

};

module.exports = ( config ) => ( req, res ) => {

	let config_id = req.params.id;
	let opts = config._index[ config_id ];

	// stop on invalid ID
	if ( !opts ) {
		res.status ( 400 ).json ( { error: 'Invalid ID' } );
	}

	if ( opts.name.match ( /bearer/i ) ) {

		getBearerToken ( opts ).then ( token => {

			res.render ( 'token', {
				layout: false,
				config: opts,
				id    : config_id,
				token : token.access_token
			} );

		} )

	} else {

		res.render ( 'token', {
			layout: false,
			config: opts,
			id    : config_id,
			token : getJWTToken ( opts )
		} );

	}

};