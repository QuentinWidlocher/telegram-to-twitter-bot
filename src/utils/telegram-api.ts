import TelegramBot from "node-telegram-bot-api";

const token = process.env.TELEGRAM_BOT_TOKEN!;

const bot = new TelegramBot(token, {
  webHook: {
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
  },
});
