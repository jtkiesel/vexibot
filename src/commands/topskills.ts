import { Constants, Message, MessageEmbed } from 'discord.js';

import { addFooter, Command, db } from '..';
import { decodeGrade, decodeProgram, decodeSeason, decodeSeasonUrl, encodeGrade } from '../dbinfo';

const rankEmojis = ['🥇', '🥈', '🥉'];
const pageSize = 10;
const previous = '🔺';
const next = '🔻';
const emojis = [previous, next];

const getDescription = (skills, index = 0): string => {
  let description = '';
  for (let i = index; i < skills.length && i < (index + pageSize); i++) {
    const skill = skills[i];
    let rank = skill._id.rank;
    rank = (rank < 4) ? `\u200B ${rankEmojis[rank - 1]} \u200B \u200B \u200B \u200B` : `**\`#${String(rank).padEnd(3)}\`**`;
    const score = String(skill.score).padStart(3);
    const programming = String(skill.programming).padStart(3);
    const driver = String(skill.driver).padStart(3);
    const team = skill.team.id;
    description += `${rank} \u200B \u200B \`${score}\` \u200B \u200B \`(${programming} / ${driver})\` \u200B \u200B [${team}](https://www.robotevents.com/teams/${decodeProgram(skill.team.program)}/${team})\n`;
  }
  return description;
};

class TopskillsCommand implements Command {
  async execute(message: Message, args: string): Promise<Message> {
    const arg = args ? args.replace(/\s+/g, '') : '';
    let grade = arg ? arg.toLowerCase() : 'h';
    let program: string, season: number;
    if (['h', 'hs', 'high', 'highschool'].includes(grade)) {
      program = 'VRC';
      grade = 'High School';
      season = 139;
    } else if (['m', 'ms', 'mid', 'middle', 'middleschool'].includes(grade)) {
      program = 'VRC';
      grade = 'Middle School';
      season = 139;
    } else if (['c', 'u', 'college', 'uni', 'university', 'vexu'].includes(grade)) {
      program = 'VEXU';
      grade = 'College';
      season = 140;
    } else {
      return message.reply('please enter a valid grade, such as **h**, **m**, or **c**.');
    }
    const skills = await db().collection('maxSkills')
      .find({'_id.season': season, '_id.grade': encodeGrade(grade)})
      .sort({'_id.rank': 1}).toArray();
    if (!skills?.length) {
      return message.reply(`no skills scores available for ${grade} ${program} ${decodeSeason(season)}.`);
    }
    let index = 0;
    program = decodeProgram(skills[index].team.program);
    grade = decodeGrade(skills[index]._id.grade);
    const seasonString = decodeSeason(skills[index]._id.season);
    const seasonUrl = decodeSeasonUrl(skills[index]._id.season);
    const embed = new MessageEmbed()
      .setColor(Constants.Colors.GOLD)
      .setAuthor(`${grade} World Skills Standings`, null, `https://www.vexdb.io/skills/${program}/${seasonString.replace(/ /g, '_')}/Robot`)
      .setTitle(`${program} ${seasonString}`)
      .setURL(seasonUrl)
      .setDescription(getDescription(skills));
    const reply = await message.channel.send(embed);
    const collector = reply.createReactionCollector((reaction, user) => {
      return (user.id === message.author.id) && emojis.includes(reaction.emoji.name);
    }, {time: 30000, dispose: true});
    const lastPage = Math.max(skills.length - pageSize, 0);
    collector.on('collect', reaction => {
      index += ((reaction.emoji.name === next) ? 1 : -1) * pageSize;
      if (index >= skills.length) {
        index = 0;
      } else if (index < 0) {
        index = lastPage;
      }
      embed.setDescription(getDescription(skills, index));
      reply.edit(embed).catch(console.error);
    });
    collector.on('remove', reaction => {
      index += (reaction.emoji.name === next ? 1 : -1) * pageSize;
      if (index >= skills.length) {
        index = 0;
      } else if (index < 0) {
        index = lastPage;
      }
      embed.setDescription(getDescription(skills, index));
      reply.edit(embed).catch(console.error);
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

export default new TopskillsCommand();
