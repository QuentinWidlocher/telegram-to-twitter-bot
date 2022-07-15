import TelegramBot from "node-telegram-bot-api";
import { getLinkCommand } from "./commands/link";
import { getNotCommand } from "./commands/notCommand";
import { getStartCommand } from "./commands/start";

export type Command = (
  bot: TelegramBot
) => Parameters<TelegramBot["onText"]>[1];

export function getCommands(bot: TelegramBot) {
  const commands: Parameters<TelegramBot["onText"]>[] = [
    [/\/start$/m, getStartCommand(bot)],
    [/^\/link\s(.*)/m, getLinkCommand(bot)],
    [/^(?!\/)(.*)/m, getNotCommand(bot)],
  ];

  return commands;
}
