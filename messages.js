const Discord = require('discord.js');

const app = require('./app');

const upsertMessageInDb = (message, deleted) => {
	if (message.guild) {
		const insert = formatMessage(message, deleted);
		app.db.collection('messages').updateOne(
			{_id: insert._id},
			{$setOnInsert: insert},
			{upsert: true}
		).then(result => {
			if (result.upsertedCount) {
				console.log(`insert to messages: ${JSON.stringify(insert)}`);
			} else {
				const edits = insert.edits;
				const update = JSON.parse(JSON.stringify(insert));
				delete update.edits;
				app.db.collection('messages').updateOne(
					{_id: update._id,
						$or: [{editedTimestamp: {$lt: update.editedTimestamp}},
							{deleted: {$ne: update.deleted}, deleted: false}]},
					{$set: update, $addToSet: {edits: {$each: edits}}}
				).then(result => {
					if (result.modifiedCount) {
						console.log(`update to messages: ${JSON.stringify(insert)}`);
					}
				}).catch(console.error);
			}
		}).catch(console.error);
	}
};

const formatMessage = (message, deleted) => {
	const document = {
		_id: `${message.channel.id}-${message.id}`,
		attachments: Array.from(message.attachments.values()).map(attachment => {
			const a = {
				filename: attachment.filename,
				filesize: attachment.filesize,
				id: attachment.id,
				url: attachment.url
			};
			if (attachment.height) {
				a.height = attachment.height;
			}
			if (attachment.proxyUrl) {
				a.proxyUrl = attachment.proxyUrl;
			}
			if (attachment.width) {
				a.width = attachment.width;
			}
			return a;
		}),
		author: message.author.id,
		channel: message.channel.id,
		cleanContent: message.cleanContent,
		content: message.content,
		createdAt: message.createdAt,
		createdTimestamp: message.createdTimestamp,
		deletable: message.deletable,
		deleted: deleted,
		editable: message.editable,
	}
	if (message.editedAt) {
		document.editedAt = message.editedAt;
	}
	if (message.editedTimestamp) {
		document.editedTimestamp = message.editedTimestamp;
	}
	document.edits = message.edits.map(edit => ({content: edit.content, timestamp: edit.editedTimestamp || edit.createdTimestamp}));
	if (message.guild) {
		document.guild = message.guild.id;
	}
	document.id = message.id;
	document.mentions = {
		everyone: message.mentions.everyone,
		roles: message.mentions.roles.keyArray(),
		users: message.mentions.users.keyArray()
	};
	if (message.mentions.channels) {
		document.mentions.channels = message.mentions.channels.keyArray();
	}
	document.pinnable = message.pinnable;
	document.pinned = message.pinned;
	document.reactions = message.reactions.keyArray();
	document.system = message.system;
	document.tts = message.tts;
	document.type = message.type;
	if (message.webhookID) {
		document.webhookID = message.webhookID;
	}
	return document;
};

const update = () => {
	app.client.guilds.forEach(guild => guild.channels.forEach(channel => {
		if (channel.type == 'text' && channel.permissionsFor(app.client.user).has('READ_MESSAGES')) {
			updateFromChannel(channel);
		}
	}));
};

const updateFromChannel = channel => {
	updateFromChannelBatch(channel, '');
};

const updateFromChannelBatch = (channel, lastMessageId) => {
	let options = {limit: 100};
	if (lastMessageId) {
		options.before = lastMessageId;
	}
	channel.fetchMessages(options).then(messages => {
		if (messages.size) {
			messages.forEach(message => upsertMessageInDb(message, false));
			updateFromChannelBatch(channel, messages.lastKey());
		}
	}).catch(error => {
		console.error(error);
		updateFromChannelBatch(channel, lastMessageId);
	});
};

module.exports = {
	upsertMessageInDb: upsertMessageInDb,
	updateFromChannel: updateFromChannel,
	update: update
};
