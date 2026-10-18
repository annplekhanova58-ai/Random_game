## ADDED Requirements

### Requirement: Successful roll is stored locally and excluded later
Система SHALL сохранять успешный розыгрыш на этом компьютере и исключать эту игру из следующих розыгрышей, пока запись существует.

#### Scenario: Selection is stored before the next roll
- **WHEN** система выбрала игру и локальная запись успешно создана
- **THEN** история на этом компьютере содержит снимок игры с идентификатором Steam, названием, обложкой, ценой USD на момент розыгрыша, ссылкой и локальным временем показа

#### Scenario: Stored game is skipped next time
- **WHEN** владелец запускает новый розыгрыш и запись с этим `steam_app_id` ещё есть
- **THEN** система не выбирает эту игру

#### Scenario: Closing the window during the spin keeps the exclusion
- **WHEN** запись уже сохранена, а окно закрыто до конца анимации
- **THEN** при следующем запуске эта игра остаётся в истории и не входит в выборку

#### Scenario: Failed local save does not finish the roll
- **WHEN** система выбрала игру, но запись на компьютере сохранить нельзя
- **THEN** система сообщает об ошибке записи, не открывает карточку результата и не считает игру показанной

#### Scenario: History snapshot keeps the price from roll time
- **WHEN** цена игры на витрине изменилась после показа
- **THEN** существующая запись по-прежнему показывает цену USD на момент розыгрыша

### Requirement: History can be viewed and deletion returns games
Система SHALL открывать локальную историю и после удаления одной записи или всей истории снова допускать эти игры к выбору.

#### Scenario: Owner opens history newest first
- **WHEN** владелец открывает историю
- **THEN** система показывает локальные записи от новых к старым с обложкой, названием, ценой на момент розыгрыша, датой и временем и ссылкой на страницу игры в Steam

#### Scenario: History opens without Steam
- **WHEN** витрина Steam недоступна и владелец открывает историю
- **THEN** система показывает сохранённые записи

#### Scenario: Missing cover still leaves the row usable
- **WHEN** обложка записи истории не загрузилась
- **THEN** строка показывает название, цену, дату и ссылку на страницу игры

#### Scenario: Deleting one record returns that game
- **WHEN** владелец удаляет одну запись истории
- **THEN** система сразу удаляет запись, не оставляет её в архиве и снова допускает этот `steam_app_id` к выбору

#### Scenario: Clearing history asks for confirmation
- **WHEN** владелец выбирает очистку всей истории и подтверждает её
- **THEN** система удаляет все записи и снова допускает эти игры к выбору

#### Scenario: Declining the clear keeps history
- **WHEN** владелец отказывается подтверждать очистку всей истории
- **THEN** система оставляет все записи на месте

#### Scenario: Empty history explains there are no rolls yet
- **WHEN** владелец открывает историю и записей нет
- **THEN** система сообщает, что показов ещё нет, и предлагает перейти к рулетке
