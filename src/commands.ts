import TelegramBot from "node-telegram-bot-api";
import { getLinkCommand } from "./commands/link";
import { getNotCommand } from "./commands/notCommand";
import { getAuthCommand } from "./commands/auth";
import { getHelpCommand } from "./commands/help";

export type Command = (
  bot: TelegramBot
) => Parameters<TelegramBot["onText"]>[1];

export function getCommands(bot: TelegramBot) {
  const commands: Parameters<TelegramBot["onText"]>[] = [
    [/\/(start|help)$/, getHelpCommand(bot)],
    [/\/auth$/m, getAuthCommand(bot)],
    [/^\/link\s\@(\S*)/m, getLinkCommand(bot)],
    [/^(?!\/)(.*)/m, getNotCommand(bot)],
  ];

  return commands;
}
