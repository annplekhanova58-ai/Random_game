## ADDED Requirements

### Requirement: Desktop shortcut opens a dedicated window
Система SHALL открываться ярлыком рабочего стола в отдельном окне компьютера и показывать экраны рулетки, результата и истории.

#### Scenario: Shortcut opens the roulette screen
- **WHEN** владелец запускает программу ярлыком на рабочем столе
- **THEN** открывается отдельное окно на экране рулетки

#### Scenario: Window keeps the three screens
- **WHEN** окно программы открыто
- **THEN** владелец может перейти к рулетке, результату текущего сеанса и истории

#### Scenario: Layout targets the desktop window
- **WHEN** владелец работает в окне программы
- **THEN** экраны рассчитаны на это окно компьютера, без отдельной телефонной вёрстки и без публичного сайта

#### Scenario: Result screen before any roll in the session
- **WHEN** владелец открывает экран результата в сеансе, где успешного розыгрыша ещё не было
- **THEN** система сообщает, что результата пока нет, и предлагает перейти к рулетке или к истории

#### Scenario: Navigation waits until the roulette stops
- **WHEN** обложки рулетки ещё крутятся
- **THEN** система не уводит с экрана рулетки на историю или новый розыгрыш до остановки на выбранной обложке

### Requirement: Interface language is Russian or English
Система SHALL показывать интерфейс на русском или английском языке и сохранять выбранный язык на этом компьютере.

#### Scenario: First launch follows the OS language
- **WHEN** программа запускается впервые и язык операционной системы русский или английский
- **THEN** интерфейс открывается на этом языке

#### Scenario: First launch defaults to Russian for other OS languages
- **WHEN** программа запускается впервые и язык операционной системы не русский и не английский
- **THEN** интерфейс открывается на русском

#### Scenario: Language switch updates the window and persists
- **WHEN** владелец переключает язык в оболочке окна
- **THEN** подписи, кнопки и сообщения переходят на выбранный язык, и этот выбор применяется при следующем запуске

#### Scenario: Store titles stay as Steam provides them
- **WHEN** интерфейс показан на русском или английском
- **THEN** названия игр остаются такими, как их отдаёт витрина Steam

### Requirement: Only the computer owner uses the app
Система SHALL открываться без входа и регистрации и предоставлять все действия единственной роли владельца компьютера.

#### Scenario: App opens without an account
- **WHEN** владелец открывает программу ярлыком
- **THEN** система не показывает вход, регистрацию или выбор аккаунта

#### Scenario: Owner can run every first-version action
- **WHEN** окно открыто владельцем компьютера
- **THEN** он может задать границу цены, запустить розыгрыш, открыть ссылку на игру в Steam, открыть историю, удалить одну запись, очистить историю и переключить язык

#### Scenario: No guest or administrator role exists
- **WHEN** программа определяет, кто выполняет действие
- **THEN** действие относится к владельцу компьютера, а отдельных ролей гостя и администратора нет

#### Scenario: Steam credentials and payment data are not collected
- **WHEN** система читает витрину или открывает страницу игры
- **THEN** она не запрашивает и не сохраняет пароль Steam, платёжные данные или данные банковской карты
