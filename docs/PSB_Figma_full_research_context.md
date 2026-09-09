# PSB Bank Redesign Concept — live Figma extraction + full project context

> **Figma:** https://www.figma.com/design/liWo1Xcsx04YGTZx3OqZNV/PSB-Bank-Redesign-Concept?node-id=25-284&m=dev  
> **File key:** `liWo1Xcsx04YGTZx3OqZNV`  
> **Live extraction:** 2026-09-08  
> **Purpose:** raw source package for Deep Research / portfolio case study.

## Important source note

The **current live Figma file exposed through the Figma API now contains 3 top-level pages**:

1. `25:284` — `-ДИСКАВЕРИ`
2. `0:1` — `⚙️ UI-Kit`
3. `36:778` — `🖼️ Иконки`

This differs from the earlier project extraction appended below, which recorded **14 pages** (Task, Current flows, Market analysis, Interviews, JTBD, Userflow, Iterations, Usability layouts, etc.).

Do **not** silently merge these two states of the file:

- **Section A** below = content verified directly from the current live Figma file.
- **Appendix B** = the earlier comprehensive project context saved after the previous 14-page Figma traversal. It is preserved unchanged as a separate source snapshot.

The current `-ДИСКАВЕРИ` page contains only the cover frame through the live API. Therefore research/interview/JTBD/user-flow facts should be grounded in Appendix B unless those pages become accessible again.

---

# A. CURRENT LIVE FIGMA — VERIFIED EXTRACTION

## A0. Live page map and counts

### `25:284` — `-ДИСКАВЕРИ`

Current node inventory:
- FRAME: 6
- VECTOR: 2
- TEXT: 2
- BOOLEAN_OPERATION: 1

Top-level:
- `2215:15595` — `_/cover`, 1920×1080

Exact visible text:
- `Redesigning  сore banking flows`
- `PSBank`

No page-level prototype starting points or reactions were returned for this page.

### `0:1` — `⚙️ UI-Kit`

Current node inventory:
- FRAME: 1463
- TEXT: 959
- COMPONENT: 187
- COMPONENT_SET: 34
- INSTANCE: 1123
- RECTANGLE: 118
- VECTOR: 430
- BOOLEAN_OPERATION: 319
- GROUP: 42
- ELLIPSE: 104
- SLOT: 13
- SECTION: 1
- LINE: 5

Main top-level documentation areas:
- `Colors & typography (Цвета и типографика)`
- `Safe area (Безопасная зона)`
- `Components (Компоненты)`
- `Animations (Анимации)`
- `Master components`

### `36:778` — `🖼️ Иконки`

Current node inventory:
- FRAME: 18
- TEXT: 8
- COMPONENT: 40
- BOOLEAN_OPERATION: 37
- VECTOR: 40

---

# A1. VISUAL NODES REVIEWED

The following live nodes were explicitly rendered/reviewed from Figma:

- `2215:15595` — cover
- `2188:13539` — `Card account`
- `2188:13892` — `Tabbar`
- `2188:14916` — `Block chart`
- `2197:19282` — `Account card flip`
- `2188:15106` — `Group card selection`

These nodes confirm that the current file contains not only documentation labels but concrete visual states for:
- account/card hierarchy;
- main tabbar with `Главная / Платежи / Выгода / Чат / Ещё`;
- cashback month/year visualization;
- card front/back reveal;
- card selection between linked cards.

---

# A2. UI KIT — EXACT DOCUMENTATION TEXT

## screenBezel

`screenBezel`

`Главный фрейм экрана с bezel`

`Превью`

`Красным оттенком выделена безопасная зона для контента`

---

## icnButton

`icnButton`

`Элемент управления, используется в навигации, полях, и баннерах`

`size`

`large (52), medium (44), small (36), xSmall (24)`

`radius`

`circle (999), squircle (8) `

`color`

`orange, neutral`

`glass`

`false, frost, liquid`

`type`

`accent, ghost`

---

## Button

`Button`

`Запускает все важные действия в интерфейсе`

`size`

`large (52), medium (44), small (36), xSmall (24)`

`radius`

`circle (999), squircle (8, 12, 16) `

`type`

`primary, secondary, danger, ghost`

`color`

`primary, neutral`

---

## Badge

`Badge`

`Показывает уведомления, счетчики и используется для навигации`

`type`

`primary, secondary`

`glass`

`true, false`

---

## CardBadge

`CardBadge`

`Показывает мин. данные о карте и используется для навигации`

`card miniature`

`orange, night`

Example values:
- `Name`
- `*0000`

---

## Checkbox

`Checkbox`

`Позволяет пользователю выбирать один или несколько вариантов  из предложенного списка`

`State`

`enabled, disabled`

---

## Card account

`Card account`

`Карточка связана с одним объектом – счетом, отображает информацию и используется для навигации`

`Type`

`account, newProduct`

Example values:
- `3`
- `Текущий счет *2307`
- `11 726 777,61 ₽`
- `Добавить`

---

## Toolbar

`Toolbar`

`Содержит важные для пользователя действия в контексте продукта, используется только в Header`

---

## Header

`Header`

`Элемент навигации, всегда находится в верхней части экрана, помогает пользователям ориентироваться в продукте`

`Type`

`main, title`

Example values:
- `Александр К.`
- `9:41`
- `Title text`

---

## Tabbar button

`Tabbar button`

`Особая кнопка, используется только в Tabbar`

`State`

`unselected, selected`

---

## Field

`Field`

`Используется для вывода значения без редактирования,  но с возможностью быстрого копирования`

Example strings:
- `label`
- `Placeholder`
- `hint text`

---

## Tabbar

`Tabbar`

`Элемент навигации, всегда находится в нижней части экрана, используется для быстрого переключения страниц продукта`

`Selected`

`1, 2, 3, 4, 5`

Exact navigation labels:
- `Главная`
- `Платежи`
- `Выгода`
- `Чат`
- `Ещё`

---

## Banner

`Banner`

`Элемент акцентного информирования пользователя внутри приложения`

`Type`

`news, newProduct, action, info`

Exact example content:

`Время сильных`

`Получайте больше выгоды инвестируя в заводы`

`Новые карточки`

`Попробуйте новые карты с хорошими условиями`

`Категории на май`

`Вы уже можете выбрать категории на следующий месяц `

`Выбрать`

`Категории на следующий месяц`

`7% Деливери, 3% на бензин, 2% на укрепление семьи`

---

## Cell

`Cell`

`Элемент навигации, используется в блоках в виде списка`

`Type`

`list, history, list_checkbox`

`State (только для list_checkbox)`

`default, selected`

---

## Block

`Block`

`Служит общим контейнером для контента внутри страницы`

`State`

`opened, closed`

`Type`

`block, chart`

---

## Shake button component

`Shake button component`

`Дрожание кнопки, дающее пользователю понять, что необходимое условие не выполнено`

`State`

`chikapaka, chikatana, chikapaka2, chikatana2, chikapaka3`

Example:
- `Выбрано 0 из 3`

---

## Bottom sheet body

`Bottom sheet body`

`Появление bottom sheet `

`State`

`closed, opened`

---

## Bg animation

`Bg animation`

`Анимированный blob на фоне`

`Frame`

`1, 2, 3, 4, 5, 6`

---

## Account card flip

`Account card flip`

`Анимация переворота карточек`

`Type`

`night, orange`

`Side`

`front, back`

Exact card strings exposed in the component:
- `СОСИТЕ`
- `*2345`
- `Данные карты`
- `*3124`
- `Номер карты`
- `4588 2344 4563 3124 `
- `Срок`
- `07/28`
- `CVV`
- `456`
- `Скрыть`

**Note:** `СОСИТЕ` is preserved exactly as it exists in the Figma text layer.

---

## Block chart

`Block chart`

`Особый информативный блок. Используется на странице “Кешбек”, если пользователь подключил`

`State`

`mouth, year`

**Note:** `mouth` is preserved exactly as it exists in Figma; it appears to be a layer/property name, not corrected here.

Exact month-state strings:
- `В этом месяце`
- `4 859`
- `Месяц`
- `Весь год`
- `834`
- `2 814`
- `1 211`
- `1,5% на все`
- `2% Авиабилеты`
- `3% Транспорт`

Exact year-state strings:
- `В этом месяце`
- `4 859`
- `Месяц`
- `Весь год`
- `4 678`
- `Ноя`
- `5 123`
- `Дек`
- `0`
- `Янв`
- `4 156`
- `Фев`
- `4 588`
- `Мар`
- `4 859`
- `Апр`

---

## Group card selection

`Group card selection`

`Элемент навигации на странице банковских карт`

`Selected`

`first, last`

Exact embedded card strings:
- `СОСИТЕ`
- `*2345`
- `Данные карты`
- `*3124`
- `Данные карты`

---

## Bottom sheet

`Bottom sheet`

`Отображает дополнительный контент внизу экрана`

Example:
- `Title`
- `Subtitle`
- `Label`

---

## Segmented control

`Segmented control`

`Позволяет пользователю выбирать один из вариантов  и сортировать контент`

`Size`

`small, xsmall`

`Selected`

`first, last`

---

## Quick action button

`Quick action button`

`Элемент для осуществления быстрых действий`

`type`

`primary, secondary`

Example:
- `Сканер QR`

---

# A3. COLORS — EXACT LIVE FIGMA VALUES

## Colors

`Colors`

`Цвета использованные в проекте`

### bg

`bg`

`Цвета фонов`

- `page` — `#0A0C0F` — `rgb(10, 12, 15)` — `hsl(216, 20, 5)` — `Фон страницы`
- `surface` — `#161A20` — `rgb(22, 26, 32)` — `hsl(216, 19, 11)` — `Первый уровень`
- `elevated` — `#242A33` — `rgb(36, 42, 51)` — `hsl(216, 17, 17)` — `Второй уровень`
- `overlay` — `#00000099` — `rgba(0, 0, 0, 0.6)` — `hsla(0, 0, 0, 0.6)` — `Оверлеи`
- `action/primary` — `#E86630` — `rgb(232, 102, 48)` — `hsl(18, 80, 55)` — `Для первичных действий`
- `action/neutral` — `#FFFFFF` — `rgb(255, 255, 255)` — `hsl(0, 0, 100)` — `Для нейтральных-первичных действий`
- `action/secondary` — `#242A33` — `rgb(36, 42, 51)` — `hsl(216, 17, 17)` — `Для вторичных действий`

### Text

`Text`

`Цвета текстов`

- `primary` — `#FFFFFF` — `rgb(255, 255, 255)` — `hsl(0, 0, 100)` — `Для основного текста`
- `secondary` — `#FFFFFF80` — `rgba(255, 255, 255, 0.5)` — `hsla(0, 0, 100, 0.5)` — `Для второстепенного  по значимости текста`
- `tertiary` — `#CCCCCC` — `rgb(204, 204, 204)` — `hsl(0, 0, 80)` — `Для третичного по значимости текста`
- `on-color` — `#0A0C0F` — `rgb(10, 12, 15)` — `hsl(216, 20, 5)` — `Для текста на цветных поверхностях`
- `action/primary` — `#E86630` — `rgb(232, 102, 48)` — `hsl(18, 80, 55)` — `Для первичных ссылок`
- `danger` — `#FE1818` — `rgb(254, 24, 24)` — `hsl(0, 99, 55)` — `Цвет ошибки для текста`
- `success` — `#11C44C` — `rgb(17, 196, 76)` — `hsl(140, 84, 42)` — `Цвет успеха для текста`

### Border

`Border`

`Цвета обводок`

- `primary` — `#E9F0F333` — `rgba(233, 240, 243, 0.2)` — `hsla(198, 29, 93, 0.2)` — `Цвет обводки первичный`
- `danger` — `#FE1818` — `rgb(254, 24, 24)` — `hsl(0, 99, 55)` — `Цвет ошибки для обводки`

### Icon

`Icon`

`Цвета иконок`

- `primary` — `#FFFFFF` — `rgb(255, 255, 255)` — `hsl(0, 0, 100)` — `Для основного текста`
- `secondary` — `#A8A8BF` — `rgb(168, 168, 191)` — `hsl(240, 15, 70)` — `Для второстепенных по значимости иконок`
- `on-color` — `#0A0C0F` — `rgb(10, 12, 15)` — `hsl(216, 20, 5)` — `Для текста на цветных поверхностях`
- `danger` — `#FE1818` — `rgb(254, 24, 24)` — `hsl(0, 99, 55)` — `Цвет ошибки для текста`
- `success` — `#11C44C` — `rgb(17, 196, 76)` — `hsl(140, 84, 42)` — `Цвет успеха для текста`
- `action/default` — `#E86630` — `rgb(232, 102, 48)` — `hsl(18, 80, 55)` — `Цвет для первичных иконок`

---

# A4. TYPOGRAPHY — EXACT LIVE FIGMA VALUES

`Typography`

`Цвета использованные в проекте`

## Title

`Title`

`Заголовки`

- `e-large` — `Onest` — `Bold` — `32px` / `40px` — `Самый крупный заголовок`
- `large` — `Onest` — `Bold` — `24px` / `32px` — `Крупный заголовок`
- `medium` — `Onest` — `SemiBold` — `20px` / `28px` — `Средний заголовок`
- `small` — `Onest` — `SemiBold` — `16px` / `20px` — `Маленький заголовок`

Sample text stored in each title token:
`The quick brown fox jumps over the lazy dog.`

## Body

`Body`

`Наборные тексты`

- `m` — `Onest` — `Regular` — `16px` / `20px` — `Наборный текст`
- `m-medium` — `Onest` — `Medium` — `16px` / `20px` — `Акцентный текст наборного текста`
- `caption` — `Onest` — `Regular` — `12px` / `16px` — `Текст подписи`
- `caption-medium` — `Onest` — `Medium` — `12px` / `16px` — `Акцентный текст подписи`

Sample text stored in each body token:
`The quick brown fox jumps over the lazy dog.`

---

# A5. MASTER COMPONENT SETS — CURRENT LIVE FIGMA

The live page contains **187 components** and **34 component sets**.

## Component sets and variants

### `shake button component`
- `state=chikapaka`
- `state=chikatana`
- `state=chikatana2`
- `state=chikapaka2`
- `state=chikapaka3`

### `bottom sheet body`
- `state=closed`
- `state=opened`

### `bg_animation`
- `frame=1`
- `frame=2`
- `frame=3`
- `frame=4`
- `frame=5`
- `frame=6`

### `quick action button`
- `type=primary`
- `type=secondary`

### `tabbar`
- `Selected=1`
- `Selected=2`
- `Selected=3`
- `Selected=4`
- `Selected=5`

### `Tabbar button`
- `State=Unselected`
- `State=Selected`

### `header`
- `type=main`
- `type=title`

### `_/ title`
- `type=default`
- `type=description`

### `icnButton`

Variants combine:
- size: `xsmall`, `small`, `medium`, `large`
- type: `accent`, `ghost`
- color: `primary`, `neutral`
- radius: `circle`, `squircle`
- glass: `false`, `frost`, `liquid`

### `badge`
- `type=primary, glass=false`
- `type=secondary, glass=false`
- `type=secondary, glass=true`

### `banner`
- `type=news`
- `type=newProduct`
- `type=action`
- `type=Info`

### `_/ 🔒blob`
- `type=orange`
- `type=purple`

### `cell`
- `Type=list, State=Default`
- `Type=history, State=Default`
- `Type=list_checkbox, State=Default`
- `Type=list_checkbox, State=Selected`

### `🔒subhead`
- `Type=Text`
- `Type=Revolution`
- `Type=Devolution`

### `_/🔒master button`
- `🔒 size=xsmall`
- `🔒 size=small`
- `🔒 size=medium`
- `🔒 size=large`

### `button`

Variant dimensions:
- type: `primary`, `secondary`, `ghost`, `danger`
- color: `accent`, `neutral`
- size: `xsmall`, `small`, `medium`, `large`
- radius: `circle`, `squircle`

### `сheckbox`
- `state=enabled`
- `state=disabled`

### `block`
- `state=opened, type=block`
- `state=closed, type=block`
- `state=closed, type=chart`

### `_/🔒 card miniature`
- `type=orange`
- `type=night`

### `_/ 🔒master segmented control`
- `🔒 size=xsmall`
- `🔒 size=small`

### `segmented control`
- `selected=first, size=xsmall`
- `selected=first, size=small`
- `selected=last, size=small`
- `selected=last, size=xsmall`

### `🔒 block bar`
- `type=block`
- `type=chart`

### `block chart`
- `state=mouth`
- `state=year`

### `🔒 column`
- `type=default`
- `type=accent`

### `🔒block_cb_history`
- `animation=start`
- `animation=end`

### `_/ 🔒master icnButton`
- `🔒 size=xsmall`
- `🔒 size=small`
- `🔒 size=medium`
- `🔒 size=large`

### `card account`
- `type=account`
- `type=newProduct`

### `Card Front`
- `type=night`
- `type=orange`

### `Card Back`
- `type=night`
- `type=orange`

### `Card flip`
- `side=front, type=night`
- `side=front, type=orange`
- `side=back, type=night`
- `side=back, type=orange`

### `group card selection`
- `Property 1=Default`
- `Property 1=Variant2`

Other named master components directly exposed:
- `t-screen`
- `toolbar`
- `block bottomsheet`
- `_/🔒 master column`
- `_/ 🔒master cell`
- `🔒Leading`
- `🔒Trailing`
- `cell/🔒 Center`
- `🔒block_history`
- `🔒block_change`
- `🔒block_checkbox_list`
- `🔒block_list`
- `field`
- `_/🔒 master field`

---

# A6. EXACT PRODUCT EXAMPLE STRINGS FOUND IN MASTER COMPONENTS

## History / transactions

`21 марта, воскресенье`

`REG.RU MOSKVA RUS`

`Оплата услуг`

`– 1 161 ₽`

`+ 20 ₽`

`TPP_TRANSPORT_FIGMA`

`Оплата по QR-коду`

`– 290 ₽`

`20 марта, суббота`

`Пятёрочка`

`Продукты`

`– 290 ₽`

`+ 20 ₽`

## Currency / exchange

`Купить`

`Продать`

`USD`

`Доллар США`

`87,36`

`5,55%`

`EUR`

`Евро`

`101,07`

`8,91%`

`CNY`

`Юань`

`12,62`

`1,23%`

`Перейти к обмену`

## Cashback categories

`1.5% На все покупки`

`Любые покупки с дебетовой карты`

`2% Авиабилеты`

`Только на авиасейлс`

`2% Самокаты`

`Яндекс, Whoosh и Юрент`

`3% На такси`

`Яндекс GO и Ситимобил `

`7% Деливери`

`Все виды доставок`

`3% На бензин`

`Лукойл, ТНК, Газпром`

`2% На укрепление семьи`

`Розовый кролик`

## Account/settings strings

`Реквизиты`

`Тарифы и лимиты`

`Справки и выписки`

`Уведомления об операциях`

`Заблокировать счёт`

---

# A7. LIVE PROTOTYPE / INTERACTION DATA

## Page-level flow status

Current Figma API returned:
- Discovery page flow starting points: none
- UI Kit page flow starting points: none

So the live file currently exposes **interactive component reactions**, not a page-level end-to-end prototype start point.

## Card flip

Instances of `🔒 account сard flip` use:
- trigger: `ON_CLICK`
- navigation: `CHANGE_TO`
- transition: `SMART_ANIMATE`
- easing: `EASE_OUT`
- duration: ~`0.35s`

## Card selection

`group card selection` uses:
- trigger: `ON_DRAG`
- navigation: `CHANGE_TO`
- transition: `SMART_ANIMATE`
- easing: `LINEAR`
- duration: ~`0.30s`

## Tap on card-detail fields

Card data fields use:
- trigger: `ON_CLICK`
- navigation: `OVERLAY`
- transition: `MOVE_IN`
- direction: `BOTTOM`
- easing: `EASE_IN`
- duration: ~`0.30s`

This is attached to the fields showing:
- `Номер карты`
- `Срок`
- `CVV`

## Hide/reveal data

Badge interaction:
- trigger: `ON_CLICK`
- navigation: `CHANGE_TO`
- transition: `SMART_ANIMATE`
- duration: ~`0.35s`
- exact label in revealed state: `Скрыть`

## Cashback month/year switch

The `Block chart` uses interactive segmented controls switching between:
- `Месяц`
- `Весь год`

with `CHANGE_TO` + `SMART_ANIMATE` and component state changes `state=mouth` / `state=year`.

## Cashback history animation

`🔒block_cb_history`:
- `animation=start`
- `animation=end`
- automatic `AFTER_TIMEOUT`
- `CHANGE_TO`
- `SMART_ANIMATE`
- duration ~`0.30s`

## Bottom sheet animation

`bottom sheet body`:
- states `closed` / `opened`
- automatic transition via `AFTER_TIMEOUT`
- `SMART_ANIMATE`
- duration ~`0.30s`

## Shake CTA

`shake button component`:
- click starts state sequence
- states:
  - `chikapaka`
  - `chikatana`
  - `chikapaka2`
  - `chikatana2`
  - `chikapaka3`
- transitions use `SMART_ANIMATE`
- several automatic `AFTER_TIMEOUT` transitions
- example CTA text: `Выбрано 0 из 3`

## Background blob

`bg_animation`:
- frames `1 → 2 → 3 → 4 → 5 → 6 → 1`
- automatic transitions
- `SMART_ANIMATE`
- `LINEAR`
- ~`6.5s` per transition

---

# A8. ICONS — EXACT COMPONENT NAMES

## Large — 32×32

- `icn_l_send`
- `icn_l_qrcode`
- `icn_l_add`
- `icn_l_sbp`
- `icn_l_card`
- `Icn_l_settings`
- `icn_l_add2`

## Medium — 24×24

- `icn_m_cashback`
- `icn_m_bankcard`
- `icn_m_hide`
- `icn_m_show`
- `icn_m_more`
- `icn_m_chat`
- `icn_m_heart`
- `icn_m_exchange`
- `icn_m_logo`
- `icn_m_add`
- `icn_m_minus`
- `icn_m_close`
- `icn_m_arrow_back`
- `icn_m_arrow_forward`
- `icn_m_send`
- `icn_m_add`
- `icn_m_copy`
- `icn_m_search`
- `icn_m_bell`
- `icon_m_circle_faq`

## Small — 16×16

- `icn_s_show`
- `icn_s_hide`
- `icn_s_cashback`
- `icn_s_bankcard`
- `icn_s_close`
- `icn_s_back`
- `icn_s_edit`
- `icn_s_triangle_up`
- `icn_s_triangle_down`
- `icn_s_back`
- `icn_s_arrow_opened`
- `icn_s_arrow_closed`
- `icn_s_check`

---

# A9. GROUNDING RULE FOR DEEP RESEARCH

When using this file:

1. Treat **Section A** as the directly verified state of the current live Figma file.
2. Treat **Appendix B** as the previous comprehensive project snapshot.
3. Do not infer that pages recorded in Appendix B are still present in the current live file.
4. Preserve explicit typos / labels from Figma when quoting (`mouth`, `Кешбек`, `СОСИТЕ`, etc.).
5. Do not convert design hypotheses into implementation claims.
6. Do not turn prototype interactions into measured usability results.
7. Do not invent PSB stakeholders, internal analytics, KPI, release, A/B tests, business metrics or post-launch outcomes.

---

# B. PREVIOUS COMPREHENSIVE FIGMA PROJECT CONTEXT — PRESERVED UNCHANGED

The following content is appended **unchanged from the existing project context file** that was created after the earlier 14-page Figma traversal.

It is not presented as a fresh live-page dump; it is a separate historical project snapshot.

---

# PSB Bank Redesign Concept — полный контекст проекта

> Источник: Figma-файл `PSB Bank Redesign Concept`  
> File key: `liWo1Xcsx04YGTZx3OqZNV`  
> Документ собран после обхода всех страниц файла через Figma Plugin API.
>
> Это внутренняя база проекта, а не готовый портфолио-кейс: здесь зафиксированы исходная задача, исследования, проблемы, конкурентный анализ, интервью, JTBD, гипотезы, userflow, итерации, финальные решения и дизайн-система.

---

## 0. Карта Figma-файла

В файле 14 страниц:

1. `25:284` — **-ДИСКАВЕРИ**
2. `7:67` — **✍🏻 Задача**
3. `7:66` — **📜 Исходные сценарии**
4. `74:1332` — **🏪 Анализ решений по рынку**
5. `25:283` — **--------------------------------------------------------------------------------------------** — пустой разделитель
6. `42:805` — **-РЕСЕРЧ** — пустая страница-разделитель
7. `7:68` — **🎙️ Интервью и инсайты**
8. `42:807` — **🐈 JTBD и гипотезы**
9. `7:69` — **🛠️ Userflow и прототипирование**
10. `858:3292` — **✍🏻 Итерации + сценарии**
11. `0:1` — **⚙️ UI-Kit**
12. `36:778` — **🖼️ Иконки**
13. `36:760` — **---** — пустой разделитель
14. `154:1179` — **🖥️ Макеты для юзабилити**

### Что лежит на страницах

- **-ДИСКАВЕРИ** — обложка `Redesigning core banking flows / PSBank`.
- **✍🏻 Задача** — продукт, аудитория, проблема, цели, бизнес-ценность и дизайн-процесс.
- **📜 Исходные сценарии** — аудит главного, карты и кешбэка + предварительные гипотезы.
- **🏪 Анализ решений по рынку** — Ozon, Райффайзен, Т-Банк, Альфа, Сбер.
- **🎙️ Интервью и инсайты** — 3 структурированных summary + 2 полных транскрипта.
- **🐈 JTBD и гипотезы** — JTBD по 3 ключевым сценариям и набор проверяемых решений.
- **🛠️ Userflow и прототипирование** — сравнение исходных и предлагаемых флоу.
- **✍🏻 Итерации + сценарии** — итерации главного, счета, карты и кешбэка + финальные flow.
- **⚙️ UI-Kit** — цвета, типографика, компоненты, анимации, master components.
- **🖼️ Иконки** — large 32×32, medium 24×24, small 16×16.
- **🖥️ Макеты для юзабилити** — две тестовые ветки: кешбэк не подключен / уже подключен.

---

# 1. Продукт и бизнес-контекст

## 1.1 Что за продукт

**PSB-Mobile** — мобильное приложение Промсвязьбанка для физических лиц. Основные возможности:
- оплата услуг;
- управление счетами;
- денежные переводы;
- банковские карты;
- кешбэк и программа лояльности.

## 1.2 Аудитория и проблема

В исходной постановке зафиксировано: заметная доля аудитории — физлица, которые получают выплаты на карты ПСБ по требованию государственных учреждений/работодателей. Для части пользователей банк является не осознанным выбором, а обязательным зарплатным или инфраструктурным банком.

Пользователи привыкли к стандартам современных мобильных банков. На их фоне интерфейс ПСБ воспринимается как барьер, поэтому после получения денег часть клиентов сразу переводит средства конкурентам.

Ключевая продуктовая проблема:

`деньги приходят в PSB → пользователь не хочет оставаться в продукте → переводит их в другой банк`.

## 1.3 Цели

- снизить отток средств в банки-конкуренты;
- сделать повседневные банковские сценарии понятнее;
- повысить количество возвращающихся клиентов;
- увеличить использование core-функций: переводы, кешбэк, управление картой.

## 1.4 Задача

Передизайнить главный экран и ключевые B2C-флоу — прежде всего просмотр данных карты и подключение кешбэка — чтобы уменьшить friction, повысить completion/conversion и в результате увеличить удержание денег и лояльность.

## 1.5 Ценность для пользователя

- безопасное и удобное управление данными карты;
- получение выгоды без погружения в юридические процессы;
- быстрое и комфортное взаимодействие со своими деньгами.

## 1.6 Ценность для бизнеса

Логика проекта:
- проще базовые операции → выше completion/conversion;
- лучше ежедневный UX → ниже отток;
- проще подключить кешбэк → больше транзакций;
- больше безналичных транзакций → выше эквайринговый доход.

## 1.7 Ожидаемый результат

- главный экран соответствует реальным пользовательским приоритетам;
- снижается когнитивная нагрузка;
- сокращается поиск важных функций;
- кешбэк подключается меньшим числом шагов;
- пользователь всегда понимает статус и следующий шаг.

---

# 2. Дизайн-процесс

В Figma зафиксирован процесс:

1. **Контекст задачи** — продукт, проблема, аудитория, роль банка.
2. **Аудит продукта** — исходные сценарии, барьеры, предварительные гипотезы.
3. **Анализ рыночных решений** — прямые конкуренты и их паттерны.
4. **Интервью** — глубинные интервью для валидации гипотез.
5. **Анализ интервью** — боли, инсайты, подтвержденные проблемы.
6. **JTBD и гипотезы** — `Core → Trigger → Outcome → Risk Reduction`.
7. **Userflow и прототипирование** — упрощение исходных флоу.
8. **Итерации редизайна**.
9. **Кликабельный прототип + анимации**.
10. **Сценарии использования**.
11. **Ожидаемые результаты**.

---

# 3. Аудит исходного продукта

## 3.1 Главный экран

### Перегрузка и визуальный шум

Главный экран состоит из большого количества однотипных по визуальному весу блоков. Пользователь тратит больше времени на поиск core-функций.

### Нет явной иерархии

Промо-баннеры выглядят почти как функциональные элементы. Реклама конкурирует с банковскими задачами.

### Карты и счета оторваны друг от друга

Счета и карты расположены как независимые сущности, хотя естественная модель ближе к:

`Счет → привязанные карты`.

### Искусственно длинная страница

Повторяющиеся кнопки скрытия/сворачивания увеличивают высоту блоков и scroll depth. Нижние функции, включая кешбэк, могут вообще не обнаруживаться.

---

# 4. Исходный сценарий: данные карты

## Контекст

Пользователь оформляет онлайн-покупку. Нужны номер карты, срок действия и CVV. Ожидание: открыть приложение и быстро скопировать данные.

## Старый flow

Примерно:

`Главный → карта → экран карты → вкладки → О карте → Данные карты → показать номер → показать CVV → согласие → SMS → ввести код → открыть данные → удерживать поле для копирования`.

## Проблемы

- у конкурентов аналогичная задача обычно решается за 1–2 шага; в ПСБ — около 7 и больше;
- первой открывается вкладка «Настройки», а реквизиты приходится искать;
- табы создают фрагментацию и не переключаются свайпом;
- номер карты дублируется, но это не ускоряет задачу;
- просмотр CVV требует отдельного согласия;
- пользователь уже авторизован PIN/биометрией, но снова получает SMS;
- SMS может задерживаться, автоввод не работает стабильно;
- для копирования нужно удерживать поле, без очевидного affordance.

Ключевой вывод: безопасность реализована как процедурный friction, а не как безопасный presentation layer.

---

# 5. Исходный сценарий: подключение кешбэка

## Контекст

Пользователь знает, что ПСБ предлагает выгодный кешбэк, и хочет подключить его перед покупками.

## Старый flow

`Главный → скролл вниз → Бонусный счет → преимущества → актуализация контактов → e-mail → согласия → проверка → письмо → почта → ссылка → браузер → подтверждение e-mail → назад в банк → согласие → подтверждение → успех → главный`.

Более 10 шагов.

## Проблемы

### Кешбэк трудно найти

Он находится почти внизу длинного главного экрана.

### Неверная терминология

`Бонусный счет` не совпадает с ожидаемым пользовательским словом `Кешбэк`.

### Выгода появляется слишком поздно

Сначала пользователь сталкивается с бюрократией, а уже потом с ценностью.

### Потеря контекста

Нужно переключаться между:
- банком;
- почтой;
- браузером.

### Повторный ввод уже известных данных

Банк просит контактные данные действующего клиента.

### Формы и ошибки

Зафиксированы:
- поздняя валидация e-mail;
- спорное использование switches;
- неочевидная повторная отправка;
- ошибки авторизации в браузере.

### Юридический язык

Простая программа лояльности ощущается как серьезный финансовый договор.

---

# 6. Исходный сценарий: выбор категорий кешбэка

Контекст: кешбэк уже подключен, начался новый период.

Старый flow:

`Главный → искать кешбэк → Бонусный счет → выбрать категории → выбор → согласие на категории → подтверждение → операция выполнена → главный`.

Проблемы:
- кешбэк снова нужно искать;
- нет заметного напоминания о новом периоде;
- много юридического языка;
- лишние confirmation-экраны;
- простая настройка выглядит как финансовая операция.

---

# 7. Анализ рынка

Рассматривались Ozon Банк, Райффайзен, Т-Банк, Альфа-Банк и Сбер.

## 7.1 Ozon Банк

### Плюсы
- быстрый доступ к счетам и картам;
- явная иконка копирования данных;
- кешбэк заметен в навигации;
- карты удобно перелистывать;
- баланс считывается сразу;
- динамический CTA показывает, сколько категорий осталось выбрать;
- если статистики кешбэка еще нет, пользователя не заставляют смотреть пустой экран.

### Минусы
- реклама может перекрывать core-функции;
- баннеры визуально однотипны;
- destructive actions могут выглядеть как обычные;
- маленькие карты хуже различаются;
- часть иконок выглядит случайно.

## 7.2 Райффайзен

### Плюсы
- безопасность без ущерба удобству;
- явное копирование каждого реквизита;
- защита чувствительных данных от screenshots;
- заметный кешбэк;
- история начислений;
- статистика выгоды.

### Минусы
- вход в саму карту местами неочевиден;
- кешбэк может теряться в маленьком badge;
- отдельные визуальные состояния имеют проблемы с контрастом.

Главный инсайт: безопасность можно усиливать в момент отображения данных, а не за счет нового длинного сценария.

## 7.3 Т-Банк

### Плюсы
- кешбэк и бонусы заметны сразу;
- короткий путь к функциям;
- хороший акцент на процентах выгоды;
- подключение укладывается примерно в 3 шага;
- пользователь остается внутри приложения.

### Минусы
- destructive actions недостаточно отличаются от обычных;
- маленькие миниатюры карт;
- часть быстрых действий визуально теряется.

## 7.4 Альфа-Банк

### Плюсы
- отдельная вкладка «Выгода»;
- быстрый доступ к кешбэку;
- интересная композиция счета.

### Минусы
- номер и CVV раскрываются разными паттернами;
- копирование неочевидно;
- переход по изображению карты неочевиден;
- кешбэк отсутствует на главном;
- выбранные и доступные категории перемешаны.

Вывод: важно не только сократить flow, но и сделать одинаковые действия консистентными.

## 7.5 Сбер

### Сильные решения
- горизонтальный быстрый доступ к карте и кешбэку;
- история близко к началу главного;
- крупное изображение карты;
- card flip для данных;
- destructive actions вынесены в отдельное меню;
- сильная визуальная иерархия;
- проценты — главный акцент выбора кешбэка;
- современные иллюстрации категорий;
- на счете видно, к чему привязана карта.

### Слабые решения
- нельзя переключаться между картами прямо на экране карты;
- срок действия нельзя копировать;
- подтверждение категорий вынесено на отдельный экран, хотя можно сократить через modal/bottom sheet.

---

# 8. Интервью

На странице есть 3 структурированных summary и 2 полных транскрипта.

## 8.1 Интервью №1

Контекст: пользователь использует много банков; ПСБ не является основным.

Основные боли:
- баннеры раздражают и возвращаются после закрытия;
- SMS для просмотра данных карты воспринимается как лишняя проверка;
- визуальная неконсистентность снижает доверие и даже создает ощущение «фейкового» приложения;
- кешбэк непонятен: пользователь не понимает, нужна ли отдельная карта;
- карта на главном слишком мала и теряется.

Вывод: проблема не в отсутствии функций, а в препятствиях вокруг ключевых задач. Редизайн должен вернуть порядок, контроль и надежность.

## 8.2 Интервью №2

Контекст: ПСБ — зарплатный банк по требованию работодателя. После зарплаты пользователь переводит деньги в другой банк.

Боли:
- «ловушка» между обычным переводом и СБП;
- история не под рукой;
- счета и карты разделены;
- инвестиционные блоки сложно убрать;
- кешбэк хороший по условиям, но неудобный по UX;
- подключение напоминает оформление кредита;
- SMS для реквизитов кажется избыточным;
- визуальный стиль кажется устаревшим.

Ключевой инсайт: ПСБ проигрывает не столько по условиям, сколько по доступу к ним. Выгода не «под рукой».

## 8.3 Интервью №3

Контекст: лояльный пользователь, для которого ПСБ — основной банк.

Даже здесь повторяются проблемы:
- забываются выбранные категории;
- кешбэк трудно найти в начале месяца;
- счета и карты разделены;
- баннеры возвращаются;
- пользователь не смог найти данные карты и воспользовался физической картой.

Вывод: проблемы воспроизводятся даже у лояльного клиента — это системный UX-дефект, а не только вопрос привычки.

---

# 9. Синтез исследования

Подтвержденные проблемы:

1. **ПСБ часто транзитный банк.** Деньги приходят и сразу уходят конкуренту.
2. **Главный экран не помогает контролировать финансы.** Ожидаются баланс, история, быстрые действия и продукты.
3. **Баннеры конкурируют с продуктом.**
4. **Счета и карты должны восприниматься одной системой.**
5. **Кешбэк имеет ценность, но плохой UX.**
6. **Безопасность реализована через friction.**
7. **Визуальная консистентность напрямую влияет на trust.**

---

# 10. JTBD

## 10.1 Копирование данных карты

### Core
Когда мне нужны реквизиты конкретной карты для оплаты, перевода или оформления услуги, я хочу быстро и безопасно открыть и скопировать данные.

### Triggers
- онлайн-оплата;
- перевод;
- получение денег;
- запрос реквизитов сервисом/организацией.

### Outcomes
- сразу понимать, какую карту открыл;
- получить данные за минимум действий;
- копировать одним очевидным действием;
- увидеть подтверждение копирования.

### Risk Reduction
- не перепутать карту;
- не сомневаться в скопированных данных;
- защитить данные от посторонних;
- не зависеть от внешних сервисов.

## 10.2 Подключение кешбэка

### Core
Когда я начинаю пользоваться услугами банка, я хочу подключить программу лояльности и начать получать выгоду.

### Outcomes
- быстро найти раздел;
- заранее понять выгоду;
- пройти несколько простых шагов;
- не выходить из приложения;
- сразу понять, что всё подключено.

### Risk Reduction
- не воспринимать flow как кредит/договор;
- не вводить заново известные банку данные;
- не терять контекст;
- не путаться в условиях.

## 10.3 Выбор категорий

### Core
Когда кешбэк подключен, я хочу выбирать и обновлять категории под реальные траты.

### Outcomes
- видеть категории;
- понимать содержание каждой;
- получить reminder;
- быстро найти кешбэк;
- видеть прошлый выбор.

### Risk Reduction
- не ошибиться в категории;
- не пропустить срок;
- не разбираться в юридическом языке.

---

# 11. Гипотезы и решения

## 11.1 Данные карты

### Сократить путь
- уменьшить навигацию примерно с 8 шагов до 2–3;
- открывать конкретную карту по миниатюре;
- первым блоком экрана карты сделать визуал карты;
- явное действие `Номер, срок, код / Показать данные`;
- убрать tabs;
- выстроить контент вертикально;
- убрать дублирование технических данных;
- связать `Счет → привязанные карты`.

### Сделать копирование очевидным
- отдельная кнопка/иконка у каждого реквизита;
- tap на поле для копирования;
- immediate feedback.

### Безопасность без лишнего flow
- маски до раскрытия;
- защита screenshots;
- не добавлять повторную авторизацию без реальной необходимости.

## 11.2 Обнаружение кешбэка

- `Бонусный счет` → `Кешбэк`;
- поднять кешбэк выше;
- связать его с историей;
- добавить `Выгода` в tabbar;
- перенести историю из tabbar на главный;
- убрать повторяющиеся кнопки скрытия.

## 11.3 Подключение кешбэка

- сократить 10+ шагов до 2–3;
- убрать повторный ввод контактов;
- убрать юридические термины;
- отказаться от подписания согласий;
- не уводить в браузер/e-mail;
- success показывать через bottom sheet;
- объяснять, что произошло и что дальше.

## 11.4 Выбор категорий

- категории видны сразу;
- info-action объясняет, что входит в категорию;
- прошлый выбор поднимается выше;
- показывается срок действия;
- reminder нового периода;
- блок `Выгода в этом году` с помесячной статистикой и общей суммой.

---

# 12. Предложенные userflow

## 12.1 Данные карты

### Было
Tabs + согласия + SMS + long tap.

### Стало

`Главный → Текущий счет → Карта → Данные карты → нажать нужный реквизит → Скопировано`.

Финальный прототип:
1. нажать `Текущий счет`;
2. увидеть привязанные карты;
3. открыть миниатюру карты;
4. нажать badge `Данные карты`;
5. раскрываются номер, срок, CVV;
6. tap по полю;
7. `Скопировано`.

## 12.2 Первичное подключение кешбэка

### Было
10+ шагов, почта, браузер, согласия.

### Стало

`Главный / Выгода → преимущества → Хочу подключить → выбрать 3 категории → Подключить → success bottom sheet`.

На disconnected-экране пользователь сразу видит value proposition:
- повышенный кешбэк 25%;
- до 5000 ₽;
- 1 балл = 1 ₽;
- партнерские предложения.

После подключения success сообщает, что категории активируются примерно в течение 15 минут.

## 12.3 Обновление категорий

`Главный / Выгода → текущий кешбэк → Выбрать → категории → success`.

В usability flow отдельное подтверждение: `Категории на май выбраны!`.

---

# 13. Итерации и финальная информационная архитектура

## 13.1 Главный экран

В Figma — 9 итераций.

Финальная версия содержит:
- header с именем пользователя;
- промо, но core-контент не должен теряться за ним;
- `Всего на счетах`;
- карточки счетов;
- признаки/миниатюры связанных карт;
- `Добавить новый продукт`;
- быстрые действия: `Оплата QR`, `Перевести`, `По номеру`, `Пополнить`;
- **История прямо на главном**;
- tabbar: `Главная / Платежи / Выгода / Чат / Ещё`.

Ключевое архитектурное изменение: история перестает быть отдельным основным destination, а `Выгода` получает место в навигации.

## 13.2 Экран счета

Финальный экран:
- `Платежный счет *6777`;
- баланс;
- привязанные карты: `Твой банк`, `Сильные люди`, `Зарплатная`;
- быстрые `Пополнить / Отправить`;
- история операций;
- настройки: реквизиты, тарифы и лимиты, справки, уведомления;
- `Заблокировать счет` отделен от ежедневных действий.

## 13.3 Экран карты

Финальный экран:
- название карты;
- родительский счет;
- несколько миниатюр карт;
- явный badge `Данные карты`;
- раскрытие номера, срока и CVV;
- tap-to-copy + `Скопировано`;
- переименование;
- где привязана карта;
- PIN;
- перевыпуск;
- destructive actions `Заблокировать / Закрыть` отдельно.

## 13.4 Экран кешбэка / Выгода

Состояния:
- disconnected;
- connecting;
- connected;
- new period;
- month;
- year.

Connected показывает:
- баланс баллов;
- дату начисления;
- выбранные категории;
- обмен в рубли;
- условия;
- статистику.

Month показывает распределение суммы по категориям.

Year показывает график по месяцам и реализует гипотезу «доказать пользователю реальную выгоду на дистанции».

FAQ вынесен в добровольный справочный слой:
- как рассчитывается кешбэк;
- когда приходит;
- сколько действуют баллы;
- как обменять на рубли.

---

# 14. Макеты для юзабилити

## 14.1 Пользователь без подключенного кешбэка

Тестовый набор:
1. главный;
2. hidden-data state;
3. счет;
4. карта;
5. overlay `Скопировано`;
6. cashback disconnected;
7. выбор категорий 0/3;
8. выбранные категории;
9. success bottom sheet.

Эта ветка одновременно проверяет новую IA, реквизиты карты и первичное подключение кешбэка.

## 14.2 Пользователь с подключенным кешбэком

Тестируется:
1. главный;
2. hidden-data state;
3. счет;
4. карта;
5. copied overlay;
6. cashback connected / новый период;
7. выбор новых категорий;
8. выбранные категории;
9. success `Категории на май выбраны`;
10. обновленный connected-state.

---

# 15. Основные продуктовые решения

1. **Главный строится вокруг реальных задач:** деньги → продукты → быстрые действия → история → выгода.
2. **История возвращается на главный:** это часть ежедневного контроля, а не отдельный раздел.
3. **Счет становится родителем для карт:** `Счет → привязанные карты`.
4. **Реквизиты превращаются из процедуры в действие:** без tabs, SMS и юридического flow.
5. **Безопасность переносится в presentation layer:** masking, screenshot protection, controlled reveal.
6. **Кешбэк называется кешбэком.**
7. **Выгода получает место в tabbar.**
8. **Кешбэк продается через value, а не договор:** проценты, рублевый эквивалент, понятные условия.
9. **Выбор категорий — простая настройка:** список + 0/3 + dynamic CTA + success.
10. **Выгода показывается на дистанции:** месяц + год.
11. **Destructive actions отделяются от ежедневных.**
12. **Визуальная консистентность используется как trust design.**

---

# 16. UI Kit

## 16.1 Цвета

### Background
- `bg/page` — `#0A0C0F`;
- `bg/surface` — `#161A20`;
- `bg/elevated` — `#242A33`;
- `bg/overlay` — `#00000099`.

### Actions
- `action/primary` — `#E86630`;
- `action/neutral` — `#FFFFFF`;
- `action/secondary` — `#242A33`.

### Text
- primary — `#FFFFFF`;
- secondary — `#FFFFFF80`;
- tertiary — `#CCCCCC`;
- on-color — `#0A0C0F`;
- danger — `#FE1818`;
- success — `#11C44C`.

### Border
- primary — `#E9F0F333`;
- danger — `#FE1818`.

### Icons
- primary — `#FFFFFF`;
- secondary — `#A8A8BF`;
- on-color — `#0A0C0F`;
- danger — `#FE1818`;
- success — `#11C44C`;
- action/default — `#E86630`.

## 16.2 Типографика

Шрифт: **Onest**.

Titles:
- e-large — Bold — 32/40;
- large — Bold — 24/32;
- medium — SemiBold — 20/28;
- small — SemiBold — 16/20.

Body:
- m — Regular — 16/20;
- m-medium — Medium — 16/20.

Caption:
- caption — Regular — 12/16;
- caption-medium — Medium — 12/16.

## 16.3 Компоненты

Документированы:
- screenBezel / safe area;
- icnButton;
- Button;
- Badge;
- CardBadge;
- Checkbox;
- Card account;
- Toolbar;
- Header;
- Tabbar button;
- Tabbar;
- Field;
- Banner;
- Cell;
- Block;
- Bottom sheet;
- Segmented control;
- Quick action button;
- Group card selection.

Master components также содержат:
- `block_change`;
- `block_checkbox_list`;
- `block_list`;
- `block_history`;
- `block_chart`;
- `block_cb_history`;
- `column`;
- account card;
- card front/back/flip.

### Важные назначения

**Header** — навигация и ориентация в продукте.  
**Toolbar** — контекстные действия продукта.  
**Tabbar** — основные destinations.  
**Card account** — информация о счете и навигация.  
**Field** — read-only значение с быстрым копированием.  
**Banner** — акцентное информирование.  
**Cell** — элемент навигации в списках.  
**Block** — общий контейнер контента.

## 16.4 Анимации

- background blob — 6 кадров;
- shake button — показывает невыполненное условие, например `Выбрано 0 из 3`;
- account card flip — front/back, night/orange;
- bottom sheet — closed/opened.

Card flip сохраняет контекст и показывает данные без ухода на отдельный экран.

---

# 17. Иконки

Назначение: иконки для элементов управления и информирования.

Размеры:
- large — **32×32**;
- medium — **24×24**;
- small — **16×16**.

В наборе есть send, QR, add, SBP, card, settings, cashback, bankcard, hide/show, more, chat, heart, exchange, logo, close, arrows, copy, search, bell, FAQ, check и др.

---

# 18. Четыре главные проблемы портфолио-кейса

## Проблема №1 — главный экран не соответствует приоритетам

**Симптомы:** шум, баннеры, длинный scroll, история отдельно, счета/карты раздроблены, кешбэк далеко.

**Решение:** новая IA, счета и карты связаны, история на главном, быстрые действия, `Выгода` в tabbar, новая иерархия.

## Проблема №2 — просмотр данных карты слишком сложный

**Было:** много экранов + tabs + SMS + long tap.

**Стало:** `Главный → Счет → Карта → Данные карты → tap to copy`.

Принцип: безопасность через presentation layer, а не procedural friction.

## Проблема №3 — кешбэк выгодный, но недоступный

**Было:** трудно найти, `Бонусный счет`, 10+ шагов, e-mail/browser, согласия, сложный язык.

**Стало:** `Выгода`, value proposition, 2–3 шага, всё внутри приложения, категории, bottom sheet success.

## Проблема №4 — пользователь не чувствует выгоду

**Было:** программа существует, но результат трудно оценить.

**Стало:** текущие баллы, категории, месяц, год, суммы, FAQ, обмен в рубли.

---

# 19. Причинно-следственная цепочка проекта

`зарплата приходит в PSB → пользователь уводит деньги конкуренту`

↓

**Вопрос:** почему банк не становится ежедневным финансовым инструментом?

↓

**Аудит:** перегрузка, плохая IA, длинные flow, скрытая выгода, неудобная безопасность.

↓

**Конкуренты:** показывают, что задачи можно решать за 2–3 шага, историю можно держать на главном, данные карты можно показывать безопасно без SMS, кешбэк может быть first-class feature.

↓

**Интервью:** подтверждают раздражение, недоверие, трудный поиск, транзитную роль банка, запрос на историю и быстрые действия.

↓

**JTBD:** скорость, понятность, контроль, выгода, безопасность без потери контекста.

↓

**Гипотезы:** сократить flow, объединить продукты, поднять важные функции, убрать внешние сервисы, показать выгоду, сделать реквизиты кликабельными.

↓

**Прототип:** три core-flow — реквизиты карты, подключение кешбэка, обновление категорий.

↓

**Финальный концепт:** новая IA + UI Kit + анимации + usability prototype.

---

# 20. Что важно не потерять при написании кейса

1. Проект начинается не с визуального редизайна, а с бизнес-проблемы оттока денег.
2. Визуальная консистентность и доверие связаны напрямую.
3. Кешбэк — пример разрыва между сильной продуктовой ценностью и слабым UX-доступом к ней.
4. Безопасность не просто «убрана»: она перенесена в masking/screenshot protection/controlled reveal.
5. `Счет → карты` — архитектурное решение, не просто карточка UI.
6. История на главном подтверждена и интервью, и конкурентным анализом.
7. `Выгода` в tabbar — крупное изменение IA.
8. График выгоды отвечает на продуктовую гипотезу, а не является декором.
9. Success bottom sheet заменяет отдельные confirmation screens.
10. UI Kit — часть решения trust-проблемы и консистентности.

---

# 21. Важные Figma node IDs

## Task
- `8:228` — задача
- `72:1153` — дизайн-процесс

## Current state
- `149:1235` — предварительные гипотезы
- `27:119` — данные карты
- `28:489` — подключение кешбэка
- `255:170` — выбор категорий

## Competitors
- `131:6` — Ozon
- `131:4` — Райффайзен
- `131:2` — Т-Банк
- `145:1398` — Альфа
- `190:356` — Сбер, выводы
- `176:1183` — Сбер, данные карты
- `181:1377` — Сбер, кешбэк
- `176:1269` — Сбер, категории

## Interviews
- `246:2525` — Interview 1 summary
- `324:165` — Interview 2 summary
- `324:199` — Interview 3 summary
- `277:2588` — full transcript
- `260:2527` — full transcript

## JTBD/Hypotheses
- `296:315` — JTBD
- `343:891` — hypotheses
- `451:711` — card design scenario
- `469:281` — cashback connect design
- `478:1168` — cashback experience design

## Userflow
- `2004:9277` — card data
- `380:2110` — cashback connect
- `380:1935` — categories

## Iterations
- `1148:5132` — main
- `2000:6265` — account
- `2018:11684` — card
- `2018:12888` — cashback
- `2071:10879` — final scenarios

## UI Kit
- `2193:16931` — colors
- `2193:18249` — typography
- `2214:16345` — master components

## Usability
- `2125:27312` — cashback not connected
- `2125:27598` — cashback connected

---

# 22. One-line проекта

**Редизайн ключевых банковских сценариев PSB Mobile, направленный на то, чтобы превратить приложение из транзитной точки для зарплаты в понятный ежедневный финансовый инструмент: упростить управление счетами и картами, сократить доступ к реквизитам и превратить кешбэк из сложной юридической процедуры в очевидную пользовательскую выгоду.**

---

# 23. Сжатая схема «проблема → решение»

| Проблема | Решение |
|---|---|
| Главный перегружен | Новая иерархия, меньше вертикального шума |
| История спрятана | История прямо на главном |
| Счета и карты разделены | `Счет → привязанные карты` |
| Данные карты за 7+ шагов | Реквизиты прямо на экране карты |
| SMS для просмотра данных | Masking + controlled reveal |
| Копирование неочевидно | Tap/copy + feedback |
| Кешбэк спрятан | `Выгода` в tabbar + badge |
| `Бонусный счет` непонятен | Термин `Кешбэк` |
| Подключение 10+ шагов | 2–3 шага |
| Почта и браузер | Всё внутри приложения |
| Юридический язык | Простая consumer-подача |
| Выбор категорий перегружен | Список + counter + dynamic CTA |
| Пользователь забывает категории | Новый период + reminder + прошлый выбор |
| Выгода не ощущается | Month/year analytics |
| Destructive actions выглядят обычными | Отдельный уровень действий |
| Интерфейс вызывает недоверие | Цельная UI-система |

---

## Итог

Проект строится как последовательность:

**исследовать причину оттока → найти friction в core-сценариях → проверить рынком и интервью → сформулировать JTBD → перевести их в гипотезы → сократить userflow → перестроить IA → собрать цельную дизайн-систему → подготовить кликабельный прототип для usability-тестирования.**
