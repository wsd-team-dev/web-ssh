const fetch = require ( 'node-fetch' );
const { get, startCase, groupBy } = require ( 'lodash' );
let hosts;

module.exports = ( config ) => {

	return {

		async refreshHosts () {
			try {

				const buffer = await fetch (
					`${config.asset_register_host}/api/assets/actions/hosts`,
					{
						method : 'GET',
						headers: {
							'Accept'           : 'application/json',
							'x-wsd-service-key': config.wsd_gateway_key
						}
					}
				);

				const { data } = await buffer.json ();

				// Map into
				// process.env.SSH_USER
				const newHosts = {};
				for ( const [ environment, groups ] of Object.entries ( data ) ) {

					for ( const [ groupName, groupHosts ] of Object.entries ( groups ) ) {

						// New grouping
						const group = groupHosts.map ( x => {

							let name = `[${x.ip}]`;
							if ( get ( x, 'dnsHost.hostname' ) ) {
								name += ` [ ${x.dnsHost.hostname.toUpperCase ()} ]`;
							}

							let tooltips = [];
							const productGroups = Object.keys ( groupBy ( x.services.filter ( x => (x.productGroup || '').length > 0 ), 'productGroup' ) )
							tooltips.push ( '<b>' + productGroups.join ( ', ' ) + '</b>' );

							if ( x.services.length > 0 ) {
								tooltips = tooltips.concat ( x.services.map ( y => {
									return `[${x.port || '-'}] ${y.name || ''} (${y.role}, ${y.type})`;
								} ) );
							}

							return {
								name   : name,
								cmd    : `ssh -t ${process.env.SSH_USER || config.ssh_user}@${x.ip}`,
								tooltip: `<p style="text-align: left; color: white;">${tooltips.join ( '<br/>' )}</p>`,
								data   : x
							}

						} );

						newHosts[ `[ ${environment.toUpperCase ()} ] [ ${startCase ( groupName )} ]` ] = group;

					}

				}

				hosts = newHosts;
				return hosts;

			} catch ( e ) {
				console.error ( 'Error fetching WSD asset hosts', e );
			}
		},

		async getHosts () {

			if ( hosts ) {
				return hosts;
			}

			return await this.refreshHosts ();

		}

	};

};