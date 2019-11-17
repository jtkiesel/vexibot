import { db } from '..';
import { getTeamId, validTeamId, getTeam, createTeamEmbed } from '../vex';
import { decodeProgramEmoji } from '../dbinfo';

const yes = '✅';
const no = '❎';

const emojis = [yes, no];

export default async (message, args) => {
  if (message.guild) {
    const teamId = getTeamId(message, args);
    if (validTeamId(teamId)) {
      try {
        const team = (await getTeam(teamId))[0];
        const program = team ? team._id.program : isNaN(teamId.charAt(0)) ? 4 : 1;
        const id = team ? team._id.id : teamId;
        const teamString = `${decodeProgramEmoji(program)} ${id}`;
        const teamSub = {
          _id: {
            guild: message.guild.id,
            team: {
              program,
              id
            }
          }
        };
        const unsub = await db.collection('teamSubs').findOne({_id: teamSub._id, users: message.author.id}) ? `you are already subscribed to updates for ${teamString}, would you like to unsubscribe?` : '';
        let reply;
        if (team) {
          reply = await message.reply(unsub || `subscribe to updates for ${teamString}?`, {embed: createTeamEmbed(team)});
        } else {
          reply = await message.reply(unsub || `that team ID has never been registered, are you sure you want to subscribe to updates for ${teamString}?`);
        }
        const collector = reply.createReactionCollector((reaction, user) => (user.id === message.author.id && emojis.includes(reaction.emoji.name)), {max: 1, time: 30000});
        collector.on('end', async collected => {
          let status;
          if (collected.get(yes)) {
            try {
              if (unsub) {
                status = 'are no longer';
                await db.collection('teamSubs').findOneAndUpdate({_id: teamSub._id}, {$set: teamSub, $pull: {users: message.author.id}});
              } else {
                status = 'are now';
                await db.collection('teamSubs').findOneAndUpdate({_id: teamSub._id}, {$set: teamSub, $addToSet: {users: message.author.id}}, {upsert: true});
              }
            } catch (err) {
              console.error(err);
              reply.edit(`${message.author}, sorry, there was an error processing your request. Please try again.`, {embed: null}).catch(console.error);
            }
          } else {
            status = unsub ? 'are still' : 'have not been';
          }
          if (message.channel.type === 'text') {
            reply.reactions.removeAll().catch(console.error);
          }
          reply.edit(`${message.author}, you ${status} subscribed to updates for ${teamString}.`, {embed: null}).catch(console.error);
        });
        await reply.react(yes);
        reply.react(no);
      } catch (err) {
        console.error(err);
      }
    } else {
      message.reply('please provide a valid team ID, such as **24B** or **BNS**.').catch(console.error);
    }
  }
};
