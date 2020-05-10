import { addFooter } from '..';
import { getTeamId, validTeamId, getTeam, createTeamEmbed } from '../vex';

const previous = '\u25C0';
const next = '\u25B6';

const emojis = [previous, next];

export default async (message, args) => {
  const arg = args ? args.replace(/\s+/g, '') : '';
  const teamId = getTeamId(message, arg);
  if (validTeamId(teamId)) {
    let team;
    try {
      team = await getTeam(teamId);
    } catch(err) {
      console.error(err);
    }
    if (team && team.length) {
      let index = 0;
      const embed = createTeamEmbed(team[index]);

      try {
        const reply = await message.channel.send({embed: embed});
        const collector = reply.createReactionCollector((reaction, user) => {
          return (user.id === message.author.id) && emojis.includes(reaction.emoji.name);
        }, {time: 30000, dispose: true});
        collector.on('collect', reaction => {
          index += (reaction.emoji.name === next) ? -1 : 1;
          if (index >= team.length) {
            index = 0;
          } else if (index < 0) {
            index = team.length - 1;
          }
          reply.edit({embed: createTeamEmbed(team[index])});
        });
        collector.on('remove', reaction => {
          index += (reaction.emoji.name === next) ? -1 : 1;
          if (index >= team.length) {
            index = 0;
          } else if (index < 0) {
            index = team.length - 1;
          }
          reply.edit({embed: createTeamEmbed(team[index])});
        });
        collector.on('end', () => {
          if (message.channel.type === 'text') {
            reply.reactions.removeAll().catch(console.error);
          }
          addFooter(message, reply);
        });
        await reply.react(previous);
        reply.react(next);
      } catch (err) {
        console.log(err);
      }
    } else {
      message.reply('that team ID has never been registered.').catch(console.error);
    }
  } else {
    message.reply('please provide a valid team ID, such as **24B** or **BNS**.').catch(console.error);
  }
};
