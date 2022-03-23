import {MessageEmbed} from 'discord.js';

export function createErrorEmbed(description?: string) {
  return new MessageEmbed({color: 0xe74c3c, description});
}

export function createInfoEmbed(description?: string) {
  return new MessageEmbed({color: 0x3598dc, description});
}

export function createSuccessEmbed(description?: string) {
  return new MessageEmbed({color: 0x2ecd72, description});
}
