# Случайная игра Steam

Локальное окно: одна игра из витрины Steam, фильтр цены, переключатель «Только бесплатные», история в SQLite.

## Запуск в этой среде

Собранный файл:

```bash
/workspace/app/src-tauri/target/release/random-steam-game
```

Ярлык меню: «Случайная игра Steam».

## Сборка заново

Нужны Node.js 20+, Rust и библиотеки GTK/WebKit.

```bash
cd app
npm install
npm run desktop:build
```
