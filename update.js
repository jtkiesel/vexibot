const Discord = require('discord.js');
const http = require('http');
const he = require('he');
const db = require('sqlite');

const tablesToColumns = require('./dbinfo');

db.open('./vexdb.sqlite')
		.then(() => Object.entries(tablesToColumns).forEach((table, columns) => {
			var columnDefinitions = [];
			Object.entries(columns).forEach((column, type) => {
				columnDefinitions.push(`${column} ${type}`);
			});
			console.log(columnDefinitions);
			console.log(columnDefinitions.join(', '));
			console.log(`CREATE TABLE IF NOT EXISTS ${table} (${columnDefinitions.join(', ')})`);
			db.run(`CREATE TABLE IF NOT EXISTS ${table} (${columnDefinitions.join(', ')})`)
					.catch(console.error);
		})).catch(console.error);
