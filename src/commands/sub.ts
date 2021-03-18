import { Message } from 'discord.js';

import { Command, db } from '..';
import { decodeProgramEmoji } from '../dbinfo';
import { getTeam, getTeamId, makeTeamEmbed, validTeamId } from '../vex';

const yes = '✅';
const no = '❎';
const emojis = [yes, no];

class SubCommand implements Command {
  async execute(message: Message, args: string): Promise<Message> {
    if (!message.guild) {
      return;
    }
    const teamId = getTeamId(message, args);
    if (!validTeamId(teamId)) {
      return message.reply('please provide a valid team ID, such as `24B` or `BNS`.');
    }
    const team = (await getTeam(teamId))[0];
    let id: string, program: number, unsub: string, reply: Message;
    if (team) {
      id = team._id.id;
      program = team._id.program;
    } else {
      id = teamId;
      program = isNaN(parseInt(teamId.charAt(0))) ? 4 : 1;
    }
    const teamString = `${decodeProgramEmoji(program)} ${id}`;
    const teamSub = {
      _id: {
        guild: message.guild.id,
        team: {
          id,
          program
        }
      }
    };
    if (await db().collection('teamSubs').findOne({_id: teamSub._id, users: message.author.id})) {
      unsub = `you are already subscribed to updates for ${teamString}, would you like to unsubscribe?`;
    }
    if (team) {
      reply = await message.reply(unsub || `subscribe to updates for ${teamString}?`, {embed: makeTeamEmbed(team)});
    } else {
      reply = await message.reply(unsub || `that team ID has never been registered, are you sure you want to subscribe to updates for ${teamString}?`);
    }
    const collector = reply.createReactionCollector((reaction, user) => (user.id === message.author.id && emojis.includes(reaction.emoji.name)), {max: 1, time: 30000});
    collector.on('end', async collected => {
      let status: string;
      if (collected.get(yes)) {
        try {
          if (unsub) {
            status = 'are no longer';
            await db().collection('teamSubs').updateOne({_id: teamSub._id}, {$set: teamSub, $pull: {users: message.author.id}});
          } else {
            status = 'are now';
            await db().collection('teamSubs').updateOne({_id: teamSub._id}, {$set: teamSub, $addToSet: {users: message.author.id}}, {upsert: true});
          }
        } catch (err) {
          console.error(err);
          return reply.edit(`${message.author}, sorry, there was an error processing your request. Please try again.`, {embed: null});
        }
      } else {
        status = unsub ? 'are still' : 'have not been';
      }
      reply.reactions.removeAll().catch(console.error);
      return reply.edit(`${message.author}, you ${status} subscribed to updates for ${teamString}.`, {embed: null});
    });
    await reply.react(yes);
    await reply.react(no);
  }
}

export default new SubCommand();
