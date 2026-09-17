import type { Env } from './types';
import type { VexaLocale } from './miniapp/i18n';

const MANDATORY_CHANNEL_KEY = 'admin:mandatory-channel:v1';

export type MandatoryChannelConfig = {
  enabled: boolean;
  chatId: string;
  title: string;
  username: string | null;
  joinUrl: string;
  updatedAt: string;
};

export type MandatoryChannelAccess = {
  required: boolean;
  joined: boolean;
  verificationError: boolean;
  channel: null | {
    title: string;
    username: string | null;
    joinUrl: string;
  };
};

export type MandatoryChannelCopy = {
  title: string;
  body: string;
  join: string;
  check: string;
  checking: string;
  notJoined: string;
  verified: string;
};

export const MANDATORY_CHANNEL_TEXT: Readonly<Record<VexaLocale, MandatoryChannelCopy>> = {
  en: { title: 'Join our channel', body: 'Join {channel} to continue using Vexa Game.', join: 'Join channel', check: "I've joined", checking: 'Checking…', notJoined: 'Membership is not confirmed yet.', verified: 'Membership confirmed' },
  fa: { title: 'عضویت در کانال', body: 'برای ادامه استفاده از Vexa Game در {channel} عضو شوید.', join: 'عضویت در کانال', check: 'عضو شدم', checking: 'در حال بررسی…', notJoined: 'هنوز عضویت شما تأیید نشده است.', verified: 'عضویت تأیید شد' },
  ru: { title: 'Вступите в канал', body: 'Вступите в {channel}, чтобы продолжить пользоваться Vexa Game.', join: 'Вступить в канал', check: 'Я вступил', checking: 'Проверяем…', notJoined: 'Подписка пока не подтверждена.', verified: 'Подписка подтверждена' },
  tr: { title: 'Kanala katıl', body: 'Vexa Game’i kullanmaya devam etmek için {channel} kanalına katıl.', join: 'Kanala katıl', check: 'Katıldım', checking: 'Kontrol ediliyor…', notJoined: 'Üyeliğin henüz doğrulanmadı.', verified: 'Üyelik doğrulandı' },
  ar: { title: 'انضم إلى القناة', body: 'انضم إلى {channel} لمتابعة استخدام Vexa Game.', join: 'الانضمام إلى القناة', check: 'انضممت', checking: 'جارٍ التحقق…', notJoined: 'لم يتم تأكيد عضويتك بعد.', verified: 'تم تأكيد العضوية' },
  es: { title: 'Únete al canal', body: 'Únete a {channel} para seguir usando Vexa Game.', join: 'Unirme al canal', check: 'Ya me uní', checking: 'Comprobando…', notJoined: 'Tu membresía aún no está confirmada.', verified: 'Membresía confirmada' },
  'pt-BR': { title: 'Entre no canal', body: 'Entre em {channel} para continuar usando o Vexa Game.', join: 'Entrar no canal', check: 'Já entrei', checking: 'Verificando…', notJoined: 'Sua participação ainda não foi confirmada.', verified: 'Participação confirmada' },
  id: { title: 'Gabung ke channel', body: 'Gabung ke {channel} untuk terus menggunakan Vexa Game.', join: 'Gabung channel', check: 'Saya sudah gabung', checking: 'Memeriksa…', notJoined: 'Keanggotaanmu belum terkonfirmasi.', verified: 'Keanggotaan terkonfirmasi' },
  hi: { title: 'चैनल से जुड़ें', body: 'Vexa Game का उपयोग जारी रखने के लिए {channel} से जुड़ें।', join: 'चैनल से जुड़ें', check: 'मैं जुड़ गया', checking: 'जाँच हो रही है…', notJoined: 'आपकी सदस्यता अभी पुष्टि नहीं हुई है।', verified: 'सदस्यता की पुष्टि हो गई' },
  de: { title: 'Kanal beitreten', body: 'Tritt {channel} bei, um Vexa Game weiter zu nutzen.', join: 'Kanal beitreten', check: 'Bin beigetreten', checking: 'Wird geprüft…', notJoined: 'Deine Mitgliedschaft ist noch nicht bestätigt.', verified: 'Mitgliedschaft bestätigt' },
  fr: { title: 'Rejoins le canal', body: 'Rejoins {channel} pour continuer à utiliser Vexa Game.', join: 'Rejoindre le canal', check: 'J’ai rejoint', checking: 'Vérification…', notJoined: 'Ton adhésion n’est pas encore confirmée.', verified: 'Adhésion confirmée' },
  it: { title: 'Unisciti al canale', body: 'Unisciti a {channel} per continuare a usare Vexa Game.', join: 'Unisciti al canale', check: 'Mi sono unito', checking: 'Verifica…', notJoined: 'La tua iscrizione non è ancora confermata.', verified: 'Iscrizione confermata' },
  uk: { title: 'Приєднайтеся до каналу', body: 'Приєднайтеся до {channel}, щоб продовжити користуватися Vexa Game.', join: 'Приєднатися', check: 'Я приєднався', checking: 'Перевіряємо…', notJoined: 'Участь ще не підтверджено.', verified: 'Участь підтверджено' },
  pl: { title: 'Dołącz do kanału', body: 'Dołącz do {channel}, aby dalej korzystać z Vexa Game.', join: 'Dołącz do kanału', check: 'Już dołączyłem', checking: 'Sprawdzanie…', notJoined: 'Członkostwo nie zostało jeszcze potwierdzone.', verified: 'Członkostwo potwierdzone' },
  vi: { title: 'Tham gia kênh', body: 'Tham gia {channel} để tiếp tục sử dụng Vexa Game.', join: 'Tham gia kênh', check: 'Tôi đã tham gia', checking: 'Đang kiểm tra…', notJoined: 'Tư cách thành viên chưa được xác nhận.', verified: 'Đã xác nhận thành viên' },
  th: { title: 'เข้าร่วมช่อง', body: 'เข้าร่วม {channel} เพื่อใช้งาน Vexa Game ต่อ', join: 'เข้าร่วมช่อง', check: 'เข้าร่วมแล้ว', checking: 'กำลังตรวจสอบ…', notJoined: 'ยังไม่ยืนยันการเป็นสมาชิก', verified: 'ยืนยันสมาชิกแล้ว' },
  ko: { title: '채널에 가입하세요', body: 'Vexa Game을 계속 사용하려면 {channel}에 가입하세요.', join: '채널 가입', check: '가입했어요', checking: '확인 중…', notJoined: '아직 가입이 확인되지 않았습니다.', verified: '가입이 확인되었습니다' },
  ja: { title: 'チャンネルに参加', body: 'Vexa Game を続けるには {channel} に参加してください。', join: 'チャンネルに参加', check: '参加しました', checking: '確認中…', notJoined: 'まだ参加を確認できません。', verified: '参加を確認しました' },
  ur: { title: 'چینل جوائن کریں', body: 'Vexa Game استعمال جاری رکھنے کے لیے {channel} جوائن کریں۔', join: 'چینل جوائن کریں', check: 'میں جوائن کر چکا ہوں', checking: 'چیک ہو رہا ہے…', notJoined: 'آپ کی رکنیت ابھی تصدیق نہیں ہوئی۔', verified: 'رکنیت کی تصدیق ہوگئی' },
  fil: { title: 'Sumali sa channel', body: 'Sumali sa {channel} para magpatuloy sa paggamit ng Vexa Game.', join: 'Sumali sa channel', check: 'Sumali na ako', checking: 'Tine-check…', notJoined: 'Hindi pa kumpirmado ang membership mo.', verified: 'Kumpirmado na ang membership' },
  ms: { title: 'Sertai saluran', body: 'Sertai {channel} untuk terus menggunakan Vexa Game.', join: 'Sertai saluran', check: 'Saya sudah sertai', checking: 'Menyemak…', notJoined: 'Keahlian anda belum disahkan.', verified: 'Keahlian disahkan' },
  'zh-Hant': { title: '加入頻道', body: '加入 {channel} 後即可繼續使用 Vexa Game。', join: '加入頻道', check: '我已加入', checking: '正在檢查…', notJoined: '尚未確認你的頻道成員資格。', verified: '已確認成員資格' },
};

type TelegramChatInfo = {
  id?: number | string;
  type?: string;
  title?: string;
  username?: string;
  invite_link?: string;
};

type TelegramMemberInfo = { status?: string; is_member?: boolean };
type TelegramUserInfo = { id?: number };

export async function getMandatoryChannelConfig(env: Env): Promise<MandatoryChannelConfig | null> {
  const raw = await env.BOT_CACHE.get(MANDATORY_CHANNEL_KEY).catch(() => null);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<MandatoryChannelConfig>;
    const chatId = String(parsed.chatId || '').trim();
    const joinUrl = String(parsed.joinUrl || '').trim();
    if (!chatId || !joinUrl) return null;
    return {
      enabled: parsed.enabled === true,
      chatId,
      title: String(parsed.title || 'Vexa').trim() || 'Vexa',
      username: parsed.username ? String(parsed.username).replace(/^@/, '').trim() || null : null,
      joinUrl,
      updatedAt: String(parsed.updatedAt || ''),
    };
  } catch {
    return null;
  }
}

export async function saveMandatoryChannelConfig(env: Env, config: MandatoryChannelConfig): Promise<void> {
  await env.BOT_CACHE.put(MANDATORY_CHANNEL_KEY, JSON.stringify(config));
}

export async function setMandatoryChannelEnabled(env: Env, enabled: boolean): Promise<MandatoryChannelConfig> {
  const current = await getMandatoryChannelConfig(env);
  if (!current) throw new Error('ابتدا کانال را تنظیم کنید.');
  const next = { ...current, enabled, updatedAt: new Date().toISOString() };
  await saveMandatoryChannelConfig(env, next);
  return next;
}

export async function resolveMandatoryChannel(env: Env, input: string): Promise<MandatoryChannelConfig> {
  const target = normalizeChannelInput(input);
  const chat = await telegramResult<TelegramChatInfo>(env, 'getChat', { chat_id: target });
  if (String(chat.type || '') !== 'channel') throw new Error('آیدی باید مربوط به یک Channel تلگرام باشد.');
  const chatId = String(chat.id || '').trim();
  if (!chatId) throw new Error('آیدی کانال معتبر نیست.');

  const me = await telegramResult<TelegramUserInfo>(env, 'getMe', {});
  if (!Number.isSafeInteger(Number(me.id))) throw new Error('شناسه ربات قابل تشخیص نیست.');
  const botMembership = await telegramResult<TelegramMemberInfo>(env, 'getChatMember', { chat_id: telegramChatTarget(chatId), user_id: Number(me.id) });
  if (botMembership.status !== 'administrator' && botMembership.status !== 'creator') {
    throw new Error('برای بررسی عضویت کاربران، ابتدا ربات را ادمین کانال کنید.');
  }

  const username = String(chat.username || '').replace(/^@/, '').trim() || null;
  const inviteLink = String(chat.invite_link || '').trim();
  const joinUrl = username ? `https://t.me/${username}` : /^https:\/\/t\.me\//i.test(inviteLink) ? inviteLink : '';
  if (!joinUrl) throw new Error('برای این کانال لینک عضویت در دسترس نیست. کانال را Public کنید یا دسترسی Invite Links را به ربات بدهید.');

  return {
    enabled: true,
    chatId,
    title: String(chat.title || username || 'Vexa Channel').trim(),
    username,
    joinUrl,
    updatedAt: new Date().toISOString(),
  };
}

export async function getMandatoryChannelAccess(env: Env, userId: string | number): Promise<MandatoryChannelAccess> {
  const config = await getMandatoryChannelConfig(env);
  if (!config?.enabled) return { required: false, joined: true, verificationError: false, channel: null };
  const channel = { title: config.title, username: config.username, joinUrl: config.joinUrl };
  try {
    const member = await telegramResult<TelegramMemberInfo>(env, 'getChatMember', {
      chat_id: telegramChatTarget(config.chatId),
      user_id: Number(userId),
    });
    return {
      required: true,
      joined: isTelegramMember(member),
      verificationError: false,
      channel,
    };
  } catch (error) {
    console.warn('Mandatory channel membership check failed', error);
    return { required: true, joined: false, verificationError: true, channel };
  }
}

function isTelegramMember(member: TelegramMemberInfo): boolean {
  const status = String(member.status || '');
  if (status === 'creator' || status === 'administrator' || status === 'member') return true;
  return status === 'restricted' && member.is_member === true;
}

function normalizeChannelInput(value: string): string | number {
  let text = String(value || '').trim();
  const link = text.match(/^(?:https?:\/\/)?(?:www\.)?t\.me\/([A-Za-z0-9_]{5,})\/?$/i);
  if (link) text = `@${link[1]}`;
  if (/^@[A-Za-z0-9_]{5,}$/.test(text)) return text;
  if (/^-?\d{5,20}$/.test(text)) {
    const numeric = Number(text);
    if (Number.isSafeInteger(numeric)) return numeric;
  }
  throw new Error('آیدی کانال را به شکل @username، لینک t.me/username یا آیدی عددی بفرستید.');
}

function telegramChatTarget(value: string): string | number {
  if (/^-?\d+$/.test(value)) {
    const numeric = Number(value);
    if (Number.isSafeInteger(numeric)) return numeric;
  }
  return value;
}

async function telegramResult<T>(env: Env, method: string, payload: unknown): Promise<T> {
  const token = String(env.BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!token) throw new Error('BOT_TOKEN تنظیم نشده است.');
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const data = await response.json().catch(() => ({})) as { ok?: boolean; result?: T; description?: string };
  if (!response.ok || !data.ok || data.result == null) throw new Error(data.description || `Telegram ${method} failed`);
  return data.result;
}
