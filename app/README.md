# Случайная игра Steam

Локальное окно: одна игра из витрины Steam, фильтр цены, переключатель «Только бесплатные», история в SQLite.

## Запуск в этой среде

Собранный файл:

```bash
/workspace/app/src-tauri/target/release/random-steam-game
```

Ярлык меню: «Случайная игра Steam».

## Windows

Установщик: `windows-build/Random-Steam-Game-Setup.exe`.

Запустите его на 64-битной Windows 10 или 11. Установка идёт для текущего пользователя и создаёт ярлык **Random Steam Game** на рабочем столе и в меню Пуск. Окно программы называется «Случайная игра Steam». Кнопка «Открыть в Steam» открывает страницу игры в обычном браузере. Если WebView2 ещё нет, установщик скачает его. Подпись кода нет, поэтому SmartScreen может написать «Windows защитил ваш компьютер»: «Подробнее» → «Выполнить в любом случае».

## Book Of Potentia 2

Отдельная установка с тем же окном, что у случайной версии: то же название «Случайная игра Steam», та же цена, переключатель «Только бесплатные» и счётчик игр. Отличие одно: при прокрутке в маркере всегда останавливается Book Of Potentia 2. Ярлык на рабочем столе называется **Book Of Potentia 2**, чтобы не затереть случайную «Random Steam Game». История у этой копии своя.

Установщик: `windows-build/Book-Of-Potentia-2-Setup.exe`.

```bash
cd app
npm run desktop:build:windows:potentia
```

Проверить в браузере без сборки Windows:

```bash
cd app
npm run dev:potentia
```

Адрес: http://127.0.0.1:43129/

## Сборка установщика случайной версии

На Linux нужен NSIS и `cargo-xwin`:

```bash
cd app
npm install
npm run desktop:build:windows
```

Готовый файл появляется в `app/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/`.

## Сборка заново (Linux)

Нужны Node.js 20+, Rust и библиотеки GTK/WebKit.

```bash
cd app
npm install
npm run desktop:build
```
