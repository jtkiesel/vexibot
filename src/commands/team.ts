import { Message } from 'discord.js';

import { addFooter, Command } from '..';
import { getTeam, getTeamId, makeTeamEmbed, Team, validTeamId } from '../vex';

const previous = '\u25C0';
const next = '\u25B6';

const emojis = [previous, next];

class TeamCommand implements Command {
  async execute(message: Message, args: string): Promise<Message> {
    const arg = args ? args.replace(/\s+/g, '') : '';
    const teamId = getTeamId(message, arg);
    if (!validTeamId(teamId)) {
      return message.reply('please provide a valid team ID, such as **24B** or **BNS**.');
    }
    const team = await getTeam(teamId) as Team[];
    if (!team?.length) {
      return message.reply('that team ID has never been registered.');
    }
    let index = 0;
    const reply = await message.channel.send(makeTeamEmbed(team[index]));
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
      reply.edit(makeTeamEmbed(team[index])).catch(console.error);
    });
    collector.on('remove', reaction => {
      index += (reaction.emoji.name === next) ? -1 : 1;
      if (index >= team.length) {
        index = 0;
      } else if (index < 0) {
        index = team.length - 1;
      }
      reply.edit(makeTeamEmbed(team[index])).catch(console.error);
    });
    collector.on('end', () => {
      if (message.channel.type === 'text') {
        reply.reactions.removeAll().catch(console.error);
      }
      return addFooter(message, reply);
    });
    await reply.react(previous);
    await reply.react(next);
  }
}

export default new TeamCommand();
