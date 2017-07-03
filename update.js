const Discord = require('discord.js');
const http = require('http');
const he = require('he');
const sqlite = require('sqlite');

const dbinfo = require('./dbinfo');
const db = new sqlite.Database('./vexdb.sqlite')
	.then(Object.entries(dbinfo.tablesToColumns).forEach(([table, columns]) => {
		var columnDefinitions = [];
		Object.entries(columns).forEach(([column, type]) => {
			columnDefinitions.push(`'${column}' ${type}`);
		});
		db.run(`CREATE TABLE IF NOT EXISTS ${table} (${columnDefinitions.join(', ')})`)
			.catch(error => {
				console.log(`CREATE TABLE IF NOT EXISTS ${table} (${columnDefinitions.join(', ')})`);
				console.error(error)
			});
	})).catch(error => {
		console.log('db.open(\'./vexdb.sqlite\')');
		console.error(error);
	});
