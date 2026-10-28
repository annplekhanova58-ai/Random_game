# Случайная игра Steam

Локальное окно: одна игра из витрины Steam, фильтр цены, переключатель «Только бесплатные», история в SQLite.

## Запуск в этой среде

Собранный файл:

```bash
/workspace/app/src-tauri/target/release/random-steam-game
```

Ярлык меню: «Случайная игра Steam».

## Windows

Установщик: `windows-build/Random-Steam-Game-Setup.exe` (копия в репозитории). Актуальный файл публикуется в GitHub Release и всегда доступен по одной ссылке:

https://github.com/annplekhanova58-ai/Random_game/releases/latest/download/Random-Steam-Game-Setup.exe

Запустите его на 64-битной Windows 10 или 11. Установка идёт для текущего пользователя и создаёт ярлык **Random Steam Game** на рабочем столе и в меню Пуск. Окно программы называется «Случайная игра Steam» и сразу открывается на весь экран. Прокрутка начинается с обложки, которая уже стоит в маркере. Описание игры на русском. Кнопка «Открыть в Steam» открывает русскую страницу магазина в обычном браузере. Если WebView2 ещё нет, установщик скачает его. Подпись кода нет, поэтому SmartScreen может написать «Windows защитил ваш компьютер»: «Подробнее» → «Выполнить в любом случае».

Тихая установка и удаление (NSIS, флаг `/S`):

```bat
Random-Steam-Game-Setup.exe /S
"%LOCALAPPDATA%\Random Steam Game\uninstall.exe" /S
```

Программа ставится в `%LOCALAPPDATA%\Random Steam Game\random-steam-game.exe`.

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

На Windows кросс-компиляция не нужна. Та же NSIS-сборка, которую запускает GitHub Actions:

```bash
cd app
npm install
npm run desktop:build:windows:native
```

Файл появляется в `app/src-tauri/target/release/bundle/nsis/` с именем вида `Random Steam Game_0.1.0_x64-setup.exe`. Workflow переименовывает его в `Random-Steam-Game-Setup.exe`.

## GitHub Release

Workflow **Windows installer** (`.github/workflows/windows-installer.yml`) работает на `windows-latest` при push в `main` и при ручном **workflow_dispatch** с ветки `main`.

Каждый успешный запуск создаёт Release с тегом `v<версия>-<номер сборки>` (версия из `app/src-tauri/tauri.conf.json`, сейчас `0.1.0`) и помечает его как latest. Имя файла в релизе постоянное, поэтому ссылка `.../releases/latest/download/Random-Steam-Game-Setup.exe` всегда ведёт на последнюю сборку.

После слияния workflow в `main` владелец включает **Settings → Actions → General → Workflow permissions → Read and write permissions**, иначе Actions не смогут создать Release. Полное описание: [корневой README](../README.md#windows-релиз-random-steam-game).

## Сборка заново (Linux)

Нужны Node.js 20+, Rust и библиотеки GTK/WebKit.

```bash
cd app
npm install
npm run desktop:build
```
