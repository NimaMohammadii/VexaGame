export type Env = {
  DB: D1Database;
  BOT_CACHE: KVNamespace;
  SECTION_LOCK_EVENTS: DurableObjectNamespace;
  LIVE_ACTIVITY: DurableObjectNamespace;
  GHOST_RUN_LIVE: DurableObjectNamespace;
  CRASH_LIVE: DurableObjectNamespace;
  RATE_LIMITS: KVNamespace;
  ASSETS: R2Bucket;
  BOT_TOKEN: string;
  /** Internal compatibility aliases populated from BOT_TOKEN by the Worker entrypoint. */
  TELEGRAM_BOT_TOKEN: string;
  GAME_BOT_TOKEN: string;
  MINI_APP_SHORT_NAME?: string;
  TONCENTER_API_KEY?: string;
  GETBLOCK_BSC_RPC_URL?: string;
  GETBLOCK_TRON_RPC_URL?: string;
  USDT_BSC_TREASURY_ADDRESS?: string;
  USDT_TRON_TREASURY_ADDRESS?: string;
  TON_WITHDRAW_MNEMONIC?: string;
  TON_WITHDRAW_PAYOUT_TOKEN?: string;
  TON_WITHDRAW_WALLET_ADDRESS?: string;
  BOT_ADMIN?: string;
};

export type TelegramChat = {
  id: number;
  type: string;
  title?: string;
  username?: string;
};

export type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type TelegramSuccessfulPayment = {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id?: string;
  provider_payment_charge_id?: string;
};

export type TelegramContact = {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id?: number;
};

export type TelegramLocation = {
  longitude: number;
  latitude: number;
};

export type TelegramPhotoSize = {
  file_id: string;
  file_unique_id?: string;
  width?: number;
  height?: number;
  file_size?: number;
};

export type TelegramDocument = {
  file_id: string;
  file_unique_id?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
};

export type TelegramMessageEntity = {
  type: string;
  custom_emoji_id?: string;
};

export type TelegramMessage = {
  message_id: number;
  text?: string;
  entities?: TelegramMessageEntity[];
  caption?: string;
  successful_payment?: TelegramSuccessfulPayment;
  contact?: TelegramContact;
  location?: TelegramLocation;
  photo?: TelegramPhotoSize[];
  document?: TelegramDocument;
  video?: { file_id: string; file_size?: number; mime_type?: string };
  animation?: { file_id: string; file_size?: number; mime_type?: string };
  audio?: { file_id: string; file_size?: number; mime_type?: string };
  voice?: { file_id: string; file_size?: number; mime_type?: string };
  chat: TelegramChat;
  from?: TelegramUser;
  reply_to_message?: TelegramMessage;
  new_chat_members?: TelegramUser[];
  left_chat_member?: TelegramUser;
};

export type TelegramChatMemberUpdated = {
  chat: TelegramChat;
  from: TelegramUser;
  date: number;
  old_chat_member?: { status?: string; user?: TelegramUser };
  new_chat_member?: { status?: string; user?: TelegramUser };
};

export type TelegramCallbackQuery = {
  id: string;
  data?: string;
  from: TelegramUser;
  message?: TelegramMessage;
};

export type TelegramPreCheckoutQuery = {
  id: string;
  from: TelegramUser;
  currency: string;
  total_amount: number;
  invoice_payload: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  pre_checkout_query?: TelegramPreCheckoutQuery;
  my_chat_member?: TelegramChatMemberUpdated;
};
