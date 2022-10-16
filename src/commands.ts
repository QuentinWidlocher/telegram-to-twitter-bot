import TelegramBot from "node-telegram-bot-api";
import { getLinkCommand } from "./commands/link";
import { getNotCommand } from "./commands/notCommand";
import { getAuthCommand } from "./commands/auth";
import { getHelpCommand } from "./commands/help";
import { Result, ResultAsync } from "neverthrow";

export type CommandResult = [regexp: RegExp, callback: (msg: TelegramBot.Message, match: RegExpExecArray | null) => ResultAsync<any, string> | Promise<Result<any, string>>];

export type Command = (
  bot: TelegramBot
) => CommandResult[1];

export function getCommands(bot: TelegramBot) {
  const commands: CommandResult[] = [
    [/\/(start|help)$/, getHelpCommand(bot)],
    [/\/auth$/m, getAuthCommand(bot)],
    [/^\/link\s\@(\S*)/m, getLinkCommand(bot)],
    [/^(?!\/)(.*)/m, getNotCommand(bot)],
  ];

  return commands;
}
