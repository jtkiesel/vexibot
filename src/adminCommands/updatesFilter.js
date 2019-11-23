import { db } from '..';
import { validTeamId, getTeam, createTeamEmbed } from '../vex';
import { decodeProgramEmoji } from '../dbinfo';

const yes = '✅';
const no = '❎';
const emojis = [yes, no];

export default async (message, args) => {
  if (!message.guild) {
    return;
  }
  const teamId = args.trim().split(' ')[0];
  if (!validTeamId(teamId)) {
    return message.reply('please provide a valid team ID, such as `24B` or `BNS`.').catch(console.error);
  }
  try {
    const team = (await getTeam(teamId))[0];
    let id, program, unfilter, reply;
    if (team) {
      id = team._id.id;
      program = team._id.program;
    } else {
      id = teamId;
      program = isNaN(teamId.charAt(0)) ? 4 : 1;
    }
    const teamString = `${decodeProgramEmoji(program)} ${id}`;
    if (await db.collection('settings').findOne({_id: message.guild.id, updatesFilter: {id, program}})) {
      unfilter = `this server is already filtering updates for that team ID, would you like to remove updates filter for ${teamString}?`;
    }
    if (team) {
      reply = await message.reply(unfilter || `add updates filter for ${teamString}?`, {embed: createTeamEmbed(team)});
    } else {
      reply = await message.reply(unfilter || `that team ID has never been registered, are you sure you want to add updates filter for ${teamString}?`);
    }
    const collector = reply.createReactionCollector((reaction, user) => (user.id === message.author.id && emojis.includes(reaction.emoji.name)), {max: 1, time: 30000});
    collector.on('end', async collected => {
      let status;
      if (collected.get(yes)) {
        try {
          if (unfilter) {
            status = 'is no longer';
            await db.collection('settings').updateOne({_id: message.guild.id}, {$pull: {updatesFilter: {id, program}}});
          } else {
            status = 'is now';
            await db.collection('settings').updateOne({_id: message.guild.id}, {$addToSet: {updatesFilter: {id, program}}}, {upsert: true});
          }
        } catch (err) {
          console.error(err);
          reply.edit(`${message.author}, sorry, there was an error processing your request. Please try again.`, {embed: null}).catch(console.error);
        }
      } else {
        status = unfilter ? 'is still' : 'is not';
      }
      reply.reactions.removeAll().catch(console.error);
      reply.edit(`${message.author}, this server ${status} filtering updates for ${teamString}.`, {embed: null}).catch(console.error);
    });
    await reply.react(yes);
    reply.react(no);
  } catch (err) {
    console.error(err);
  }
};
