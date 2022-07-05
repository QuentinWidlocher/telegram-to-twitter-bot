import { TelegramRequestMessage, TelegramResponseBody } from "../types";

export type ResponseData = {
  text: string;
  params?: TelegramResponseBody;
};

export type Command = (
  params: string,
  message: TelegramRequestMessage
) => Promise<ResponseData>;

export function createButtonHorizontalList(
  buttons: { label: string; command: string }[]
): TelegramResponseBody {
  return createButtonGrid([buttons]);
}

export function createButtonVerticalList(
  buttons: { label: string; command: string }[]
): TelegramResponseBody {
  return createButtonGrid(buttons.map((b) => [b]));
}

export function createButtonGrid(
  buttons: { label: string; command: string }[][]
): TelegramResponseBody {
  const buttonsList = buttons.map((row, index) => {
    const buttonsRow = row.map((button, index) => ({
      text: button.label,
      callback_data: button.command,
    }));

    return buttonsRow;
  });

  return {
    reply_markup: {
      inline_keyboard: buttonsList,
    },
  };
}
