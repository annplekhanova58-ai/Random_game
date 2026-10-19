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

Собрать установщик заново (на Linux нужен NSIS и `cargo-xwin`):

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
