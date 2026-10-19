const ru = {
  productName: 'Случайная игра Steam',
  roulette: 'Рулетка',
  history: 'История',
  result: 'Результат',
  language: 'Язык',
  rouletteLead: 'Одна уже вышедшая игра не дороже заданной цены.',
  maxPrice: 'Максимальная цена, USD',
  freeOnly: 'Только бесплатные',
  draw: 'Крутить',
  poolCount: 'В розыгрыше {count} {word}',
  poolCountLoading: 'Считаю игры в розыгрыше…',
  poolCountError: 'Не удалось узнать количество игр в магазине Steam.',
  priceError: 'Введите неотрицательную цену в USD.',
  emptyCatalog:
    'Не осталось уже вышедшей игры в пределах цены, которой ещё нет в истории. Поднимите границу или откройте историю.',
  emptyFreeCatalog:
    'Не осталось бесплатной игры, которой ещё нет в истории. Выключите «Только бесплатные» или откройте историю.',
  openHistory: 'Открыть историю',
  steamError: 'Витрина Steam недоступна.',
  retry: 'Повторить',
  showSteamError: 'Показать ошибку Steam',
  prototypeState: 'Состояние прототипа',
  prototypeHint: 'Показывает баннер недоступной витрины и не запускает розыгрыш.',
  spinning: 'Обложки крутятся…',
  loadingStore: 'Загружаю обложки с витрины Steam…',
  landed: 'Выбрана игра',
  winner: 'Победитель розыгрыша',
  free: 'Бесплатно',
  openSteam: 'Открыть в Steam',
  newDraw: 'Новый розыгрыш',
  noResult: 'В этом сеансе ещё не было успешного розыгрыша.',
  goRoulette: 'Перейти к рулетке',
  delete: 'Удалить',
  clearHistory: 'Очистить историю',
  confirmClearTitle: 'Очистить всю историю?',
  confirmClearBody: 'Все записи будут удалены, и показанные игры снова смогут выпасть.',
  confirmClear: 'Очистить',
  cancel: 'Отмена',
  emptyHistory: 'Показов ещё нет.',
  historyLead: 'Новые показы сверху. Пока запись на месте, эта игра не выпадает снова.',
  priceAtDraw: 'Цена на момент розыгрыша',
} as const;

export type MessageKey = keyof typeof ru;

const en: { [K in MessageKey]: string } = {
  productName: 'Random Steam Game',
  roulette: 'Roulette',
  history: 'History',
  result: 'Result',
  language: 'Language',
  rouletteLead: 'One released game at or below your price.',
  maxPrice: 'Maximum price, USD',
  freeOnly: 'Free only',
  draw: 'Spin',
  poolCount: '{count} {word} in this draw',
  poolCountLoading: 'Counting games in this draw…',
  poolCountError: 'Could not read the Steam store game count.',
  priceError: 'Enter a non-negative price in USD.',
  emptyCatalog:
    'No released game within this price is left outside history. Raise the limit or open history.',
  emptyFreeCatalog:
    'No free game is left outside history. Turn off Free only or open history.',
  openHistory: 'Open history',
  steamError: 'The Steam storefront is unavailable.',
  retry: 'Retry',
  showSteamError: 'Show Steam error',
  prototypeState: 'Prototype state',
  prototypeHint: 'Shows the storefront-unavailable banner and does not start a draw.',
  spinning: 'Covers are spinning…',
  loadingStore: 'Loading covers from the Steam storefront…',
  landed: 'Selected game',
  winner: 'Draw winner',
  free: 'Free',
  openSteam: 'Open on Steam',
  newDraw: 'New draw',
  noResult: 'There is no successful draw in this session yet.',
  goRoulette: 'Go to roulette',
  delete: 'Delete',
  clearHistory: 'Clear history',
  confirmClearTitle: 'Clear all history?',
  confirmClearBody: 'Every entry will be deleted, and shown games can be drawn again.',
  confirmClear: 'Clear',
  cancel: 'Cancel',
  emptyHistory: 'No draws yet.',
  historyLead: 'Newest draws first. A game stays out of the draw while its entry remains.',
  priceAtDraw: 'Price at the time of the draw',
};

export type Lang = 'ru' | 'en';

export function t(lang: Lang, key: MessageKey): string {
  return lang === 'en' ? en[key] : ru[key];
}

export function formatPrice(amount: number, lang: Lang): string {
  if (amount === 0) return t(lang, 'free');
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ru-RU', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatWhen(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function localizedNote(noteRu: string, noteEn: string, lang: Lang): string {
  return lang === 'en' ? noteEn : noteRu;
}

export function formatPoolCount(count: number, lang: Lang): string {
  const formatted = new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ru-RU').format(count);
  const word = lang === 'en' ? (count === 1 ? 'game' : 'games') : ruGameWord(count);
  return t(lang, 'poolCount').replace('{count}', formatted).replace('{word}', word);
}

function ruGameWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'игра';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'игры';
  return 'игр';
}
