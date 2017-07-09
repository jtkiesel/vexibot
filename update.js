const db = require('sqlite');

const dbinfo = require('./dbinfo');

db.open('./vexdb.sqlite').then(() => {
	db.run('CREATE TABLE IF NOT EXISTS messages (user TEXT, count NUMBER)')
		.catch(error => {
			console.log('CREATE TABLE IF NOT EXISTS messages (user TEXT, count NUMBER)');
			console.error(error);
		});
	Object.entries(dbinfo.tablesToColumns).forEach(([table, columns]) => {
		let columnDefinitions = [];
		Object.entries(columns).forEach(([column, type]) => {
			columnDefinitions.push(`'${column}' ${type}`);
		});
		db.run(`CREATE TABLE IF NOT EXISTS ${table} (${columnDefinitions.join(', ')})`)
			.catch(error => {
				console.log(`CREATE TABLE IF NOT EXISTS ${table} (${columnDefinitions.join(', ')})`);
				console.error(error)
			});
	});
}).catch(error => {
		console.log('db.open(\'./vexdb.sqlite\')');
		console.error(error);
});
