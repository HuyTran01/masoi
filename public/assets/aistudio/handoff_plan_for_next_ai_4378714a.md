# Giao Việc: Hoàn Thiện Game Ma Sói 3D (`masoi`) — Dành Cho Agent Trong Google AI Studio (Build)

Bạn là agent lập trình trong **Google AI Studio — Build mode**, đang làm việc trên repo đã import từ GitHub `HuyTran01/masoi`. Tài liệu này là toàn bộ yêu cầu. Mọi quyết định sản phẩm đã được chủ dự án chốt (Mục 3); **không hỏi lại**, chỉ hỏi khi gặp tình huống tài liệu không nói tới.

---

## 1. Cách Làm Việc Trong AI Studio

1. **Làm tuần tự từng wave** (Wave 0 → Wave 5). Mỗi lượt chat chỉ làm **một wave**. Không gộp wave.
2. **Cổng kiểm thử là GitHub Actions.** Việc đầu tiên của Wave 0 là tạo `.github/workflows/ci.yml` (Mục 4). Sau mỗi wave: kiểm tra build trong preview (sửa hết lỗi build/TypeScript), commit và push qua đồng bộ GitHub, rồi **dừng lại chờ** chủ dự án báo kết quả CI. Chỉ sang wave tiếp khi CI xanh.
3. **Không tự khẳng định "test đã pass"** nếu không có log CI. Nếu không chạy được `npm test` trong môi trường này, ghi rõ "chưa chạy, chờ CI".
4. **Sửa file lớn theo từng đoạn nhỏ.** `src/App.tsx` dài ~7.400 dòng: định vị bằng tên hàm và đoạn code xung quanh, không viết lại cả file.
5. **Hạn chế tạo file mới** (nền tảng có thể giới hạn số file của app). Ưu tiên thêm test vào file test có sẵn. Nếu nền tảng báo lỗi lưu do quá nhiều file: gỡ 7 ảnh chụp trong `public/assets/aistudio/` sau khi xác nhận không file nào tham chiếu tới (`assets/aistudio` không xuất hiện trong `src/` và `index.html`). **Không xóa** âm thanh trong `public/audio/sfx/`.
6. **Kết thúc mỗi wave bằng báo cáo** theo mẫu ở Mục 6.

---

## 2. Bối Cảnh Dự Án

- **Stack:** React 19 + Vite + Three.js (client); `server.ts` dùng Express + `ws` (WebSocket) + Vite middleware (server). Đường phụ Netlify: `netlify/functions/api.mts` + Netlify Blobs (giữ nguyên, không phát triển thêm).
- **File chính:**
  - Luật: `src/game/rules.ts`, `src/game/roles.ts`
  - Quản trò tự động & bot: `src/game/autoGM.ts`, `src/game/smartAI.ts`
  - Online: `src/server/onlineMatchEngine.ts`, `src/server/realtimeRooms.ts`, `src/utils/realtimeClient.ts`, `server.ts`, `src/server/apiRouter.ts`
  - Trợ Lý Quản Trò: `src/server/gmRooms.ts`, `src/components/GMAssistantView.tsx`, `src/components/VirtualCardPlayerView.tsx`
  - Giao diện: `src/App.tsx`, `src/components/*`, 3D ở `src/components/WerewolfVillage3D.tsx`
  - Ngôn ngữ: `src/utils/i18n.ts`
- **Lệnh:** `npm run lint` (`tsc --noEmit`), `npm test` (`tsx --test` trên 10 file test), `npm run build`.
- **Trạng thái hiện tại (commit `703e9c0`):** lint 0 lỗi; `npm test` **1191/1191 pass**; build thành công. Thợ Săn đã chuyển sang cơ chế "ghim đạn ban đêm"; pha `hunter_revenge` đã bỏ (chỉ còn trong khai báo kiểu `Phase` ở `src/types/game.ts` và đoạn chuyển đổi snapshot cũ ở `src/App.tsx`).

---

## 3. Quyết Định Đã Chốt (Không Hỏi Lại)

1. **Thợ Săn — súng chỉ có tác dụng khi chết vào ban đêm.**
   - Ban đêm Thợ Săn thức dậy (sau Bảo Vệ, trước Ma Sói), ghim 1 người còn sống hoặc chọn `🚫 Không ghim`.
   - Chết **ban đêm** (Sói cắn, Bình Độc, chết theo Tình Nhân) → tự bắn người bị ghim, **xuyên Khiên Bảo Vệ và Bình Cứu Phù Thủy**; trừ khi không ghim, người bị ghim đã chết, hoặc đang bị Già Làng phong ấn.
   - Bị **treo cổ ban ngày** → súng **không kích hoạt**, người bị ghim **không chết**. Không có pha `hunter_revenge`.
2. **Hết giờ `0s` ở lượt đêm của người thật** → tự qua bước. Thợ Săn chưa chọn = **không ghim** (`hunterTargetId = null`, bot không được ghim thay). Vai khác chưa chọn = bỏ qua kỹ năng.
3. **Chỉ còn 2 ngôn ngữ: `vi` và `en`.** Gỡ `fr`/`es`/`ja`. Giá trị cũ `fr`/`es`/`ja` trong `localStorage.werewolf_lang` → chuyển về `en`.
4. **Cân bằng & đồng hồ đêm:**
   - Bàn 6 người: 2 Ma Sói vs 4 Dân (`werewolf, werewolf, seer, bodyguard, villager, villager`).
   - Mọi bước đêm có **cùng thời lượng** (vai sống/chết, bot/người như nhau) để không lộ thông tin.
   - **Chế độ AI** có nút **`⏭ Bỏ qua` / `⏭ Skip`** để tua bước không phải lượt mình. Chế độ Online không có nút này cho người chơi thường.
5. **Chat chế độ AI phải hiểu và trả lời như người thật.**
6. **Online và Trợ Lý Quản Trò phải chạy thật** cho nhiều người chơi thật tạo phòng và chơi cùng nhau ổn định.
7. **Kiểm thử bằng nhiều người chơi độc lập** cho mọi chế độ, mọi chức năng → tổng hợp nhận xét → lập kế hoạch sửa vòng tiếp.

---

## 4. Quy Tắc Kỹ Thuật Bắt Buộc

1. **Rules of Hooks:** không khai báo React hook sau một `return` sớm. `src/components/RoomLobbyModal.tsx` (~L483) có `if (!isOpen) return null;` — lỗi này từng làm sập cả lobby.
2. **`NightActions.hunterTargetId`:** `undefined` = chưa chọn (bot được điền thay); `null` = chọn `🚫 Không ghim` hoặc hết giờ. Không dùng `|| null` làm mất ranh giới này.
3. **Không lộ dữ liệu bí mật:** dữ liệu gửi xuống người chơi còn sống không được chứa vai của người khác (trừ đồng đội Sói), mục tiêu đêm của người khác, hay chat Hồn Ma.
4. **Không đổi luật / giao diện ngoài phạm vi** tài liệu. Giữ nguyên comment không liên quan.
5. Mọi logic mới không tầm thường phải có ít nhất 1 test.

**Nội dung `.github/workflows/ci.yml` (tạo ở Wave 0):**
```yaml
name: ci
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm install
      - run: npm run lint
      - run: npm test
      - run: npx vite build
      - run: npx esbuild netlify/functions/api.mts --bundle --platform=node --format=esm --outfile=/tmp/api-check.mjs
      - name: hunter_revenge guard
        run: test "$(grep -rn "hunter_revenge" src server.ts | wc -l)" -le 2
```

---

## 5. Các Wave

### Wave 0 — CI, Luật Thợ Săn, Hết Giờ `0s`, Bàn 6 Người, Đồng Hồ Đêm
1. Tạo `.github/workflows/ci.yml` như Mục 4.
2. `src/game/rules.ts`:
   - `applyDayLynch` (~L688–773): bỏ việc tự bắn theo `hunterMarkId` khi Thợ Săn chết ban ngày (treo cổ hoặc chết dây chuyền ban ngày); chỉ xóa `hunterMarkId`. Sửa nơi gọi trong `src/App.tsx` (~L3421, L3444, L3488) và `src/server/onlineMatchEngine.ts` (~L817, L994–995).
   - `resolveNightActions` (~L389–397): câu giải thích đổi thành *"Nếu chết trong đêm nay, phát đạn ghim sẽ tự động bắn hạ…"*. Giữ nguyên phần tự bắn khi chết ban đêm (~L556–580).
   - Bàn 6 người (~L68–70): đổi sang 2 Sói vs 4 Dân như Mục 3. Cập nhật mô tả bộ vai 6 người trong `src/utils/i18n.ts` và các test liên quan trong `src/game/rules.test.ts`, `src/game/qa1000TestSuite.ts`.
3. `src/game/roles.ts`: mô tả Thợ Săn (`vi`/`en`) ghi rõ súng chỉ kích hoạt khi chết ban đêm.
4. Hết giờ `0s`:
   - `shouldAutoAdvanceOnTimerZero` (`src/game/autoGM.ts` ~L2169): pha `night` trả `true` ở `0s` kể cả khi người chơi đang thức.
   - Tự qua ở bước `hunter` của người thật mà `hunterTargetTonightId === undefined` → gán `null`.
   - Server Online: hết giờ bước `hunter` mà chưa nhận `hunter_mark` → `null`.
5. Đồng hồ đêm đồng đều: `getStepInitialTimerSeconds` (`autoGM.ts` ~L1398) và phần dựng bước đêm của server (`DEFAULT_BOT_STEP_SEC = 4` ~L195, `phaseEndsAt` ~L507) dùng **cùng một thời lượng** cho mọi bước.
6. Nút `⏭ Bỏ qua` / `⏭ Skip` ở chế độ AI (`src/App.tsx`, `src/components/NightActionConsole.tsx`): hiện khi không phải lượt mình, kể cả lúc màn hình đêm đang bị che mắt.
7. **Test:** treo cổ Thợ Săn → người bị ghim còn sống, `hunterShots` rỗng; Thợ Săn chết đêm → người bị ghim chết dù có Bảo Vệ/Phù Thủy cứu; hết `0s` ở bước Thợ Săn → `hunterTargetId === null`; bước đêm có người sống và không có ai sống dài bằng nhau.

**Hoàn thành khi:** CI xanh, toàn bộ test cũ + mới pass.

### Wave 1 — Chỉ Còn `vi` + `en`
1. `src/types/game.ts` (~L181): `export type Language = 'vi' | 'en';` rồi sửa mọi lỗi TypeScript phát sinh.
2. `src/App.tsx`: giá trị `werewolf_lang` khác `vi`/`en` → dùng `en`.
3. Gỡ lựa chọn `fr`/`es`/`ja` khỏi mọi menu chọn ngôn ngữ và bỏ các nhánh `fr`/`es`/`ja` trong `src/utils/i18n.ts`, `src/game/roles.ts`, helper `tr(...)` trong `autoGM.ts` / `smartAI.ts` / `App.tsx`, các bảng dịch cục bộ trong `AgrouAvatarLockerModal.tsx`, `RoleEncyclopediaView.tsx`, `RoomLobbyModal.tsx`.
4. Các nhánh `lang === 'vi' ? … : …` còn lại đã đủ `vi`/`en`, giữ nguyên.
5. `src/components/GMAssistantView.tsx`: dịch sang `en` các chuỗi tiếng Việt cố định (tiêu đề "Phần 1: Lời Quản Trò Đọc To…", nút thuốc Phù Thủy, thông báo hoàn tác, tên ghế mặc định `Người Chơi #` / `Player #`).
6. Online: `src/server/onlineMatchEngine.ts` đang tạo thông báo Bình Minh / Hoàng Hôn / phim chết với `lang: 'vi'` cố định (~L719, L735, L819, L1341). Client gửi `lang` khi tạo/vào phòng (`src/utils/realtimeClient.ts`, `server.ts`, `src/server/realtimeRooms.ts`); server dựng thông báo cho cả `vi` và `en`, gửi đúng bản cho từng người xem.
7. Test parity ngôn ngữ (`src/game/rules.test.ts` ~L91, `src/game/smartAI.test.ts` ~L52) kiểm tra `['vi', 'en']`.

**Hoàn thành khi:** CI xanh; không còn chuỗi `'fr'`, `'es'`, `'ja'` trong `src/`.

### Wave 2 — Chat Chế Độ AI Như Người Thật
**Tầng 1 — luật trên client (luôn chạy):** sửa `src/game/smartAI.ts` (`generateHumanChatResponses` và các beat thảo luận).
- Gọi bot bằng tên hoặc số ghế (`#3`, `số 3`, `bạn số 5`) → đúng bot đó trả lời trước.
- Hỏi lý do (`"sao vote tao"`, `"vì sao nghi #4"`, `"bằng chứng đâu"`) → bot nêu bằng chứng công khai trong `AIMatchBrain` (ai im lặng, ai đẩy phiếu, ai nhận vai).
- Hỏi nhận định (`"ai là sói"`, `"#2 thấy #6 thế nào"`, `"đêm qua ai chết"`, `"còn mấy sói"`) → trả lời theo trạng thái thật của ván và tính cách bot.
- Người chơi khai vai và hành động đêm (`"tôi soi #7 là sói"`) → bot kiểm tra chéo, phản bác nếu trùng vai thật của mình; Sói tìm cách bẻ lái.
- Câu ngắn (`"vote ai"`, `"skip"`, `"hello"`) → đáp ngắn, tự nhiên.
- Thêm `usedChatLinesByRound` và lịch sử 5–8 tin gần nhất vào `AIMatchBrain`: không 2 bot nói trùng nguyên văn trong một ngày; không lặp câu vouch qua các đêm.
- Ý định bỏ phiếu của bot khớp với điều nó vừa nói trong chat.

**Tầng 2 — Gemini qua server (khi có `GEMINI_API_KEY`):**
- Endpoint mới `POST /api/ai-chat` trong `src/server/apiRouter.ts`, gọi Gemini bằng `@google/genai`.
- Client chỉ gửi dữ liệu **công khai** (chat công khai, ai sống/chết, sự kiện công khai) cộng với vai và trí nhớ riêng **của đúng bot được chọn trả lời** (và đồng đội Sói / Tình Nhân của chính bot đó). Không bao giờ gửi vai của người chơi hay bot khác.
- Giới hạn tần suất theo phiên, timeout ~2.500 ms, trả 1–2 câu ngắn đúng tính cách và ngôn ngữ.
- Lỗi, hết quota hoặc quá giờ → tự dùng Tầng 1, người chơi không thấy lỗi.

**Test** (`src/game/smartAI.test.ts`): hỏi bằng số ghế; hỏi lý do vote; hỏi ai đáng nghi; khai vai trùng bị phản bác; không trùng câu trong một ngày; payload gửi `/api/ai-chat` không chứa vai bí mật của người khác.

**Hoàn thành khi:** CI xanh; chat vẫn hoạt động khi không có `GEMINI_API_KEY`.

### Wave 3 — Backend Online & Trợ Lý Quản Trò Chạy Thật Trên Cloud Run
App được deploy bằng nút Publish lên **Cloud Run**. Ràng buộc và cách xử lý:
1. **WebSocket bị cắt theo request timeout** (mặc định 5 phút) → client tự kết nối lại: heartbeat ping/pong, reconnect kèm `playerSecret`, server gửi lại **toàn bộ** trạng thái ván (chat, phiếu, kết quả Tiên Tri, đồng đội Sói, trạng thái Hồn Ma).
2. **Nhiều instance không chia sẻ bộ nhớ** → app được thiết kế cho **1 instance**; ghi rõ trong README.
3. **Container có thể khởi động lại** → lưu snapshot phòng vào **Firestore** bằng `exportSnapshot` / `importSnapshot` có sẵn trong `src/server/realtimeRooms.ts` (~L284, L302): ghi khi trạng thái phòng đổi (có giới hạn tần suất), nạp lại khi khởi động. Nếu dự án chưa bật Firebase, ghi rõ trong báo cáo, không làm dở.

Rà soát, sửa và **có test chứng minh**:
- Thao tác trong phòng được xử lý tuần tự: 2 client bấm cùng lúc hoặc hết giờ đúng lúc không làm đêm/ngày bị giải quyết 2 lần.
- Chủ phòng rớt mạng: có thời gian chờ vào lại; quá ngưỡng thì chuyển quyền chủ phòng cho người thật tiếp theo (`realtimeRooms.ts` ~L464); không xóa phòng khi chỉ chớp mạng.
- Nhiều Sói là người thật: thấy lựa chọn của đồng đội theo thời gian thực; 2 Sói chọn khác nhau rồi hết giờ vẫn ra kết quả đúng.
- Bỏ phiếu đồng thời: mọi người thấy cùng kết quả, đúng trọng số x2 của Thị Trưởng.
- Không lộ dữ liệu (Quy tắc 3 ở Mục 4).
- Trợ Lý Quản Trò (`src/server/gmRooms.ts`): tạo phòng → link/QR `?gm=CODE` → 4–12 thiết bị vào chọn ghế; chống trùng ghế; token chống cướp ghế khi tải lại trang; chia bài ván mới.
- Dọn phòng hết hạn; giới hạn tần suất đăng nhập / tạo phòng / chat.
- **Integration test đa client** (chạy trong `npm test`): khởi động HTTP + WS server thật trên cổng ngẫu nhiên; 4–6 client WebSocket thật chơi trọn một ván (tạo phòng → vào phòng → bắt đầu → đêm → ngày → bỏ phiếu → kết thúc → chơi lại), có 1 client mất kết nối rồi vào lại. Thêm một bộ tương tự cho `gmRooms`.

**Hoàn thành khi:** CI xanh với các integration test mới.

### Wave 4 — 3D Bàn 20 Người, Banner Quản Trò, Thẻ Hồn Ma, Dọn Kỹ Thuật
- `src/components/WerewolfVillage3D.tsx`:
  - Bàn 20 người: rê chuột lên thân ghế `#6` và `#13` thì con trỏ đổi thành bàn tay nhưng click không đổi mục tiêu. Kiểm tra `getRayHitTarget` (~L1215–1268) và `onPointerUp` (~L1484–1559); nới vùng bấm khi bàn ≥ 14 người.
  - Bảng tên trên đầu nhân vật đè nhau ở bàn 20 người: trong vòng cập nhật nhãn (~L3786–3860) thu nhỏ nhãn ở xa hoặc đẩy lệch theo chiều dọc khi chồng nhau.
- `src/components/GMAssistantView.tsx`: thông báo người chết dây chuyền khi treo cổ (đang tự tắt sau 2,5 giây, ~L474) thành banner **giữ tới khi bấm `✕`**; tự xóa khi qua đêm mới / Reset / Hoàn tác; có `vi`/`en`.
- `src/components/NightActionConsole.tsx` (~L218–224): thẻ của Hồn Ma phân biệt "vai đã chết hết" và "vai còn sống nhưng hết quyền năng / bị phong ấn".
- `src/server/onlineMatchEngine.ts`: đêm có người chết thì cộng thêm ~5.000 ms vào `ANNOUNCEMENT_GRACE_MS` (~L197, L783); kèm 1 test.
- Dọn kỹ thuật: gỡ trường thừa `hunterShotSec` (`autoGM.ts` ~L43/L51, `App.tsx` ~L579, `TitleScreenOverlay.tsx` ~L637/L669, `onlineMatchEngine.ts` ~L205, `rules.test.ts` ~L190); chỉ hiện nhãn `👻 Hồn Ma` sau khi phim chết cuối đêm chạy xong; hiện số mạng Già Làng (`2/2` → `1/2`) cho chính Già Làng; tìm nguyên nhân thẻ vai thỉnh thoảng bị bỏ qua đầu trận Online.

**Hoàn thành khi:** CI xanh.

### Wave 5 — Kiểm Thử Nhiều Người Chơi
Môi trường này không cho bạn tự điều khiển trình duyệt, nên bạn chuẩn bị 2 tầng kiểm thử tự động chạy trên CI, và tổng hợp phản hồi người thật do chủ dự án gửi.

**Tầng A — Bot người chơi mô phỏng (trong `npm test`):** file mới `src/server/playtestSim.test.ts`.
- Khởi động server thật; 4–20 người chơi là client WebSocket độc lập, mỗi người một tính cách: người mới hay bấm sai, người hay tranh luận, người tải lại trang (ngắt rồi vào lại), người cố phá (spam vote, spam xác nhận, gửi hành động sai lượt).
- Chơi nhiều ván Online liên tiếp ở các cỡ 6 / 8 / 12 / 20 người, có chơi lại và chủ phòng rời giữa chừng; làm tương tự cho phòng Trợ Lý Quản Trò.
- Sau mỗi ván khẳng định: không kẹt pha, không kẹt đồng hồ, không trùng phiếu, không lộ vai, thắng/thua đúng luật, luật Thợ Săn mới đúng.
- In báo cáo tóm tắt (số ván, lỗi gặp, thời gian từng pha) ra log CI.

**Tầng B — Trình duyệt thật trên CI (Playwright):** file mới `e2e/multiplayer.spec.ts` và job `e2e` trong `.github/workflows/ci.yml` (devDependency `@playwright/test`; job chạy `npx playwright install --with-deps chromium`, khởi động `npm run dev`, chờ cổng 3000).
- Mỗi người chơi là một **browser context riêng**: 1 chủ phòng + 3 khách (1 khách màn hình 390×844, 1 khách dùng `en`) vào cùng 1 phòng Online, chơi trọn 1 ván; thêm 1 luồng Trợ Lý Quản Trò (chủ phòng + 3 điện thoại mở `?gm=CODE`).
- Chụp ảnh từng pha, ghi lỗi console, lưu ảnh/video làm artifact. Job chỉ chạy khi push lên `main` hoặc chạy tay.

**Tầng C — Phản hồi người thật:** chủ dự án sẽ cho người thật (hoặc agent trình duyệt bên ngoài) chơi theo 5 đợt dưới đây rồi dán nhận xét vào chat. Việc của bạn: ghi tất cả vào `docs/qa_round2_report.md`, phân loại P0–P3, lập kế hoạch sửa và thực hiện như một wave mới.

| Đợt | Nội dung | Tiêu chí đạt |
| :--- | :--- | :--- |
| 1 — Online nhiều người thật | 1 chủ phòng + 3–4 khách vào bằng mã phòng, lấp bot lên 8 và 20 ghế, chơi 2 ván có chơi lại; 2 người cùng làm Sói; đổi phiếu, phiếu trắng; 1 người tải lại trang giữa trận; chủ phòng thoát giữa chừng. | Ghế đồng bộ 100%, không bỏ rơi khách, Sói không bị bỏ lượt, đồng hồ đêm đều nhau, người `vi` thấy tiếng Việt và người `en` thấy tiếng Anh, vào lại không mất ghế, không lộ vai / chat Hồn Ma. |
| 2 — Trợ Lý Quản Trò nhiều thiết bị | Quản Trò 12 người (bài ảo QR và bài giấy), 3–4 điện thoại mở `?gm=CODE`; ván có Cupid, Thợ Săn, Phù Thủy, Già Làng, Sói Con; giành ghế đã có chủ; treo cổ 1 Tình Nhân; Hoàn tác 3 bước; Ẩn Vai Trò; chia bài ván 2. | Vào bằng link/QR trơn tru, chống cướp ghế, sống/chết đồng bộ ngay, banner người chết dây chuyền đọc kịp, hoàn tác đúng thứ tự, mobile không tràn ngang. |
| 3 — Chế độ AI | Bàn 4 / 6 / 8 / 12 / 20; chat đủ kiểu (hỏi bằng số ghế, hỏi lý do vote, khai vai giả, tranh luận dài); nút `⏭ Bỏ qua`; để hết giờ ở lượt Thợ Săn; Thợ Săn chết đêm và bị treo cổ ban ngày. | Bot hiểu câu hỏi, trả lời khớp ván, không lặp câu, không lộ vai; bàn 6 cân bằng; luật Thợ Săn và hết giờ `0s` đúng. |
| 4 — 3D, âm thanh, đạo cụ | 3 bản đồ; góc nhìn thứ nhất `[V]` và sau lưng `[B]`; đi lại, nhảy, ném đạo cụ, emote; bấm thân nhân vật quanh bàn 20 người; màn hình chính sau trận; Tủ đồ, Sổ tay, Bách khoa vai trò, Bảng xếp hạng, Lịch sử đấu, Đăng nhập. | Bấm 3D nhạy cả 4 phía, bảng tên không đè nhau, không lỗi WebGL/console, màn hình chính sạch, âm thanh không lỗi, nút trên mobile không bị che. |
| 5 — Phá hoại & trường hợp hiếm | Spam nút; tải lại trang giữa phim ngắn / bảng Bình Minh / thảo luận / bỏ phiếu; 2 tab cùng tài khoản; hòa phiếu; Kẻ Chán Đời thắng; Tình Nhân khác phe thắng; Bán Sói bị cắn và bị soi cùng đêm; Nhân Bản chết cùng đêm với hình mẫu; Thị Trưởng bị treo cổ vẫn giữ `👑 (x2)`. | 0 màn hình sập, 0 kẹt pha/đồng hồ, 0 phiếu trùng, 0 lộ vai, thắng/thua đúng. |

**Hoàn thành khi:** Tầng A và B xanh trên CI; sau mỗi vòng phản hồi Tầng C, mọi lỗi P0/P1 đã được sửa và CI xanh lại.

---

## 6. Mẫu Báo Cáo Cuối Mỗi Wave

```
Wave: <số>
Đã làm: <danh sách thay đổi theo file>
Test thêm/sửa: <tên test>
Kiểm tra trong AI Studio: <build preview: OK / lỗi gì>
Chưa kiểm chứng: <những gì cần CI hoặc người thật xác nhận>
Bỏ qua / để lại: <việc chưa làm và lý do>
Cần chủ dự án làm: <ví dụ: xem kết quả CI, thêm secret, cấu hình Cloud Run>
```

---

## 7. Định Nghĩa Hoàn Thành Toàn Bộ

- Wave 0–4 xong, CI xanh.
- Tầng A và B của Wave 5 xanh trên CI.
- Ít nhất một vòng phản hồi người thật (Tầng C) đã được ghi vào `docs/qa_round2_report.md` và mọi lỗi P0/P1 trong đó đã sửa xong.
