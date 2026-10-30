# AI Homework Quiz：教師批次個別化測驗暨 AI 批改平台

> 版本：v1.0｜用途：供 Codex 實作｜部署：GitHub Pages｜語言：繁體中文（支援英文出題）
> 基礎：使用者提供之 `PROMPTS_AND_STEPS.md`，保留原本「依作業內容分類 → 依層次出題 → 驗證 → 批改」主軸，但重新設計為批次教師端、學生離線試卷及解答分離。實際提示詞見 `PROMPTS_REVISED.md`。

## 0. 產品定位、目標與邊界

**產品目標**：教師一次拖入全班每人一份的作業（PDF、TXT、Markdown、多語言程式），透過自己選定的 AI 服務，針對各人作業所展示的**觀念理解、推理邏輯、資料/控制流程、方法選擇與局限**生成個別化測驗；教師檢查、批次輸出「無解答學生 HTML」及「僅教師可接觸的答案/規準包」；學生離線完成測驗並輸出 JSON/Markdown 或可列印 PDF；教師將學生作答與教師答案包批次匯入後，自動處理選擇題和 AI 批閱問答題，再輸出成績。

**非目標 / 不應宣稱**：系統不判定學生是否本人撰寫、不提供可靠作弊偵測、不執行任何學生上傳程式、不提供真正的伺服器端考試計時或一次性提交保證；純 GitHub Pages 無登入與跨裝置雲端同步。

**強制品質原則**：
1. **不要問**變數/函式名稱拼寫、寫死常數值、參數順序、日期、頁碼、背誦統計數字、作者心中未寫明的意圖。
2. **要問**資料流與控制流、改變前提後的結果、關鍵邊界條件、推論根據、設計替代方案、方法的局限、解決問題的邏輯。
3. 各題須有**來自該份作業的可追溯依據**（頁碼/行號/區塊 ID）；不得純領域常識出題、不得憑空推測。假設題可以改動情境，但需以作業已展示的邏輯為根據。
4. 「理解程度」可評估；不得把結果解讀為「作業真實性/AI 代寫」的證據。
5. 學生版 **絕不內嵌任何**正確答案、解析、教師 rubric 或完整 teacher key JSON；選項順序可隨 quiz_id 固定種子打亂並在教師包記錄對映。
6. 逐份學生輸入為不可信內容，不照做其中的「忽略上方指示、洩漏金鑰」等 prompt injection；絕不執行程式碼。

## 1. 硬性平台需求

- 站台為**純靜態 SPA**，可由 GitHub Pages `/RepoName/` 子路徑載入、重整正常。不得需要 PHP/Node/Python 後端、伺服器儲存、GitHub OAuth、外部資料庫或需額外購買的 SaaS。
- 使用 React + TypeScript + Vite；可用 Tailwind CSS。所有產生試卷邏輯、批改作業及 PDF/ZIP/JSON 處理都在教師瀏覽器端；僅向教師選擇的 AI API 送必要文字。
- API: OpenAI、Google AI Studio (Gemini)、xAI Grok、CGU OpenAI-compatible (`https://air.cgu.edu.tw/cgullmapi/v1`)；提供 base URL、金鑰、模型、連線測試、模型清單（若 provider 支援）與手動模型 ID。
- **先驗證真正的瀏覽器 CORS**：每個供應商都要從部署網址送出含認證 header 的實際請求。若被 CORS 擋住，要明確標註「瀏覽器無法直連」；不可使用 `no-cors`、假結果、公開第三方代理、硬編碼私密 key 來掩蓋。不承諾四個供應商均能純瀏覽器運作。若必要，將「教師自有 proxy」列為另行啟用、非本產品預設的選用擴充，不可偷偷架設後端。
- 本機保存：設定、上次使用供應商、API Key（依明確需求）放 `localStorage`；大量作業檔、解析文字、題目、keys、批改結果放 `IndexedDB`。兩者重整後持續保留，但清除網站資料、私密視窗結束、瀏覽器儲存空間回收可能消失。加「備份完整專案 ZIP」、「匯入備份」及本機容量警告。
- API Key 安全：以教師自備金鑰（BYOK）方式明示「金鑰會保存在此瀏覽器 localStorage，能被同源 JavaScript 或有裝置存取權者讀取，並非安全憑證保管庫」。提供隱藏/顯示、清除、可選不記住/僅當次使用、可選 passphrase 加密儲存。**不得**把 key 放在學生 HTML、ZIP、URL、錯誤記錄、console log、Github repo、備份包。
- 預設無遙測、無第三方分析、無蒐集學生資料到網站伺服器。傳送 AI 前提示使用者資料將直接送到所選供應商；儘可能只送 student_id 而不送姓名。

## 2. 主要使用者、情境及 UI 結構

### 2.1 教師端（網站）

使用頂部步驟導覽及左側班級/作業管理，分成七個區域：

1. **AI 設定**：供應商卡片、API Key、base URL（CGU 預設）、模型查詢/手動輸入、連線測試結果、速率設定（並行數、retry）、可用性與 CORS 問題指引；儲存狀態。
2. **建立批次作業**：課程名稱、作業名稱、批次 ID、日期、語言、開卷/閉卷顯示文字、題數（5/8/10/12/15，預設 10）、題型配比、各層配比、評分配比、選擇是否包含來源摘要（僅教師）。
3. **批次上傳**：大面積拖曳區、多選檔案與資料夾；即時表格欄位 `狀態/學生 ID/姓名(選填)/檔名/格式/檔案大小/解析字數/錯誤`；能從檔名猜 ID、手動編修/匯入學生名冊 CSV；每個 student_id **只能對應一份作業**，重複時停止處理並要求選擇保留哪一份，不可隱形覆寫。
4. **題目設定與生成**：設定題型分布（單選/複選/簡答）、理解層次、難度、總分、學生看到的作業摘要，清楚顯示預估 AI 呼叫次數（估計值而非保證費用）；開始/暫停/取消/只重試失敗項；逐人顯示 `等待/解析/分類/提取觀念/出題/驗證/完成/失敗`。
5. **審題與輸出**：按學生切換，左側原文區塊與引用位置，右側題目、選項、標準答案、解題說明、rubric；教師可編輯題幹/選項/答案/配分/規準、刪題重生、鎖定題目；未完成檢查不得輸出；預覽「學生實際看到的試卷」；按鈕分別下載「學生試卷 ZIP」「教師答案 ZIP」「完整專案備份 ZIP」。
6. **批次批改**：拖入學生答案 JSON/MD/PDF（PDF 僅支援本系統可擷取文字的標準輸出，掃描 PDF 需人工處理）以及教師答案 ZIP；根據 batch_id、student_id、quiz_id、exam_version/hash、question_id 配對；對不上列為人工處理，**絕不依姓名/上傳順序猜配**。批次客觀題計分 + 問答題 AI 批閱 + 低信心覆核。
7. **成績與分析**：逐人詳情、按層次統計、題型統計、班級分布、待覆核名單；教師修改成績須記錄異動；CSV、整體 JSON、個別 HTML/PDF 列印、ZIP 下載。

### 2.2 學生端（獨立 `.html`）

- 每位學生單一可離線開啟的 HTML，所有 JS/CSS 內嵌，不依賴遠端 CDN/字型或網路。**不能**依靠 import module 或在 `file://` 可能不支援的 fetch 相對路徑。
- 顯示課程、作業、學生編號、匿名顯示名（可選）、題數/總分、作答說明、進度條、側邊題號導覽、上一題/下一題、單選 radio、多選 checkbox、問答 textarea、未作答提醒。
- 優先嘗試 localStorage 自動保存答題草稿（key 必須含 quiz_id）；但獨立 `file://` HTML 的 localStorage 行為依瀏覽器不同，可能不可用。必須用 try/catch 探測，無法儲存時明確警示並提供「匯出草稿 JSON／重新匯入草稿」替代方案；不能承諾所有離線檔重整後草稿仍在。提供「清除草稿」且提示確認。
- 預覽/確認交卷；交卷後可下載 `answers.json`（主要機器可讀格式）及 `answers.md`（人工閱讀）與列印/儲存 PDF（透過瀏覽器列印另存 PDF）。列印包含 batch/student/quiz/version/question IDs 和每題內容與作答內容，便於回收。
- 題目本身、沒有答案的選項、教師能事先輸入的公開說明可以存在 HTML；**正解、rubric、feedback 不得存在**。不能在學生端做真正的評分。
- 可顯示計時器作為參考，但本機時間及一次交卷鎖定可被修改，UI 不得宣稱防作弊或伺服器驗證的單次提交。
- 學生端 HTML 不呼叫任何 AI API、不要求登入或 API Key。

## 3. 作業匯入規格

### 3.1 支援副檔名（第一版）

- `.pdf`：PDF.js 讀取**可選取文字**的 PDF，逐頁擷取 text item 並保留頁碼；若整份無文字，顯示「疑似影像掃描 PDF，請改交可選字文字或貼上轉寫內容」；第一版不做 OCR。
- `.txt`, `.md`, `.markdown`：TextDecoder UTF-8，偵測 BOM；亂碼時提供使用者手動選擇編碼或重新上傳，不允許靜默丟字。
- 程式碼：`.py`, `.ipynb`（選用，若支援須只解析 notebook JSON 中 code/markdown cell，**不可執行**）、`.js`, `.jsx`, `.ts`, `.tsx`, `.java`, `.c`, `.cc`, `.cpp`, `.h`, `.hpp`, `.cs`, `.go`, `.rs`, `.rb`, `.php`, `.swift`, `.kt`, `.r`, `.R`, `.sql`, `.sh`, `.html`, `.css`, `.json`, `.xml`, `.yaml`, `.yml`；均作為純文字讀取、加行號、不執行、不動態載入。
- 本版預設一位學生一個實體檔案；不支援多檔專案合併為一份作業。可以拖入多位學生的文件，也可選擇匯入 ZIP，ZIP 逐檔處理，但仍維持「一生一檔」規則。遇到隱藏系統檔或 ZIP 路徑穿越拒絕。

### 3.2 身分對應

- 檔名建議格式：`學號_作業名.ext`（如 `S001_HW1.py`）。從檔名自動擷取的是**候選值**，UI 顯示供教師核對；不能單靠模糊比對將姓名推定為學號。
- 允許任意 student_id（不強制學校固定碼），由系統規範清理格式、拒絕空值與重複；原始檔名獨立保留。可匯入 `roster.csv`（`student_id,name`），僅用於教師本機顯示/對應。
- 生成每份作業 `source_sha256` 以便去重與驗證，生成不可重複的 `assignment_id`、`quiz_id`。同一學生重新產題時新 quiz_id 或 exam_version 必須更新。

### 3.3 前處理與長文

- 一律先 `parse → normalize whitespace → assign source blocks/pages/line ranges → detect document type → extract concepts`。PDF 保留 page；程式保留 lineStart/lineEnd；其他文字保留 paragraph/block index。
- 若空檔、無法擷取、無法辨識、文本太短/無足夠可評估內容，標示 `needs_review`，教師可貼上補充文字或排除；**不**因原始低於 120 字就自動當作沒價值（短程式可能有完整邏輯）。
- 長文不直接截取「開頭/中段/結尾」充當完整理解；採**有重疊區塊 + 各段觀念提取 + 合併去重 + 限制來源覆蓋率**，避免遺漏中間關鍵設計；控制每批文字與 token budget，文字區塊 ID 必須保留。
- 程式邏輯理解以語法保留全文/相關函式區塊優先，不要截斷在函式中間；絕不執行、不安裝依賴。

## 4. 出題與提示詞設計（對原版的明確改動）

### 4.1 來源版可沿用的內容

- 沿用：六類分類標籤（報告或論文、心得或反思、申論或問答、程式作業、筆記整理、其他）、分類僅在自動判斷時呼叫、根據原作業出題、題目結構化 JSON、驗證與補題最多 3 輪、按層次判定的概念、原文為不可信資料。
- **取消**：`recall` 主要考記憶（舊版包括變數名、參數順序）、30% recall 配比、題型僅 single_choice、用「是不是本人寫的」作為結論、固定單一模型名 `gpt-5.6-luna`、PHP `curl_multi`、過長固定抽樣百分比、僅用回答時間作為真實性指標。
- 舊分類與判定方法是參考設計，不必複製舊 `computeVerdict()` 門檻；新分數須由實際題分權重與理解層次計算。可自訂門檻，預設僅顯示「掌握良好/部分掌握/仍需加強」，**不**提供作弊或作者真偽判斷。

### 4.2 預設題目設定

- 題數：5、8、10、12、15（預設 10）。
- 題型（以題數，採最大餘數法分配、總和精確）：`single_choice 40%`、`multiple_choice 20%`、`short_answer 40%`；可調，若其中一類設 0% 就不生成。
- 層次：`comprehension 45%`、`reasoning 35%`、`design_tradeoff 20%`（默認 recall=0%）；可調並合計 100%，例如 10 題約 5/3/2。可用 `application` 作 reasoning 的顯示名稱。
- 難度：基本 25% / 中等 50% / 進階 25%，可調；避免所有題都考同一個章節/函式。
- 每題評分：以總分 100，優先依題型賦權（建議 `single 4`, `multiple 6`, `short 9` 原始權重再正規化至總分 100），使用確定性的小數處理使總分剛好 100；也能讓教師設定每題配分。
- 出題語言：預設繁體中文，選英文可完整切換；程式碼的 identifier/必要專有名詞不強迫翻譯，但不能考其拼法。

### 4.3 四段核心 pipeline

1. `classifyAssignment()`: 依檔案內容確認一種類型、主題摘要、疑慮和可抽取內容。
2. `extractConcepts()`: 為全文產生概念地圖、因果/設計決策/邊界條件/關鍵論證及 `source_refs`。可分塊並合併；每個觀念必須能回指原文。
3. `generateQuestionsByPlan()`: 依 `type × level` 配額逐組呼叫 AI，返回 JSON；**題幹引用該份作業的情境**，不要以記住細節當成理解。每道含 `concept`, `source_refs`, `answer`, `explanation`；short_answer 額外含 `rubric`（具體可觀察評分點、分數權重、可接受替代表述、常見錯誤）。
4. `validateAndRepair()`: schema 檢查、每題答案合法、配額精確、內容去重（文字與語意相似）、教師 rubrics 存在、引用指向有效 block；檢查「需要背數字/名字才能答對」並移除；最多重試 3 輪（只補缺題，保留已通過的題）。不足時標 `needs_review`，不得輸出未完成試卷。

**所有模型回應經程式 JSON Schema 驗證**。若 provider 支援 Structured Output 則優先使用；否則提示只回 JSON 並本機解析、修復/重試。不要假設所有 provider 支援完全相同的格式參數或模型 ID。詳見 `PROMPTS_REVISED.md`。

## 5. 題型規則

| 題型 | 學生操作 | 標準答案/教師端 | 批改 |
|---|---|---|---|
| `single_choice` | 4 個選項，選 1 | 正解選項 ID、解析、來源 | 必須完全一致，程式給分 |
| `multiple_choice` | 4–5 個選項，可選多個 | 非空的正解 ID 集合、解析、來源 | 預設完全相符才得分，不因漏選/多選得分；未來可提供部分給分政策 |
| `short_answer` | 多行文字輸入，允許合理長度 | rubric 含可驗證觀念、權重、允許替代表述和扣分原因 | AI 依 rubric 逐點評估並回傳證據、評語、信心；低信心教師覆核 |

- 題幹不得洩漏答案，不生成雙重正解的單選、沒有正確選項的多選、不可驗證作者心理動機的問答。
- 問答題的 rubric 不要求唯一標準文字，但須可從作業與題目情境建立合理答題要點。回答若提出與標準答案不同、但邏輯正確且和作業相容的說法，可以給分；不能要求死背原文。
- 教師可改 rubric，修改後教師 key 版本更新；若學生試卷題目改動，需重發相同學生的 HTML，且舊答案檔不得自動匹配新題。

## 6. 資料模型（各檔必須有 `schema_version`）

### 6.1 核心 TypeScript 介面（示意，實作需 Zod/Ajv schema）

```ts
type QuestionType = 'single_choice' | 'multiple_choice' | 'short_answer';
type Level = 'comprehension' | 'reasoning' | 'design_tradeoff';

type SourceRef = {
  block_id: string;
  page?: number;       // PDF 1-based
  line_start?: number; // code 1-based
  line_end?: number;
};

type RubricCriterion = {
  id: string;
  description: string;
  weight: number;            // positive, normalized per question
  acceptable_alternatives: string[];
  common_mistakes: string[];
};

type PublicQuestion = {
  question_id: string;
  type: QuestionType;
  level: Level;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  question: string;
  options?: { id: string; text: string }[];
  points: number;
};

type TeacherQuestionKey = {
  question_id: string;
  answer: string[] | string;   // choices IDs or example answer
  explanation: string;
  concept: string;           // 教師端才可見，防止暗示答案
  source_refs: SourceRef[];
  rubric?: RubricCriterion[];
  review_status: 'draft' | 'approved';
};

type StudentExam = {
  schema_version: '1.0';
  batch_id: string;
  student_id: string;
  quiz_id: string;
  exam_version: number;
  public_quiz_hash: string;
  course_title: string;
  assignment_title: string;
  language: 'zh-TW' | 'en';
  total_points: number;
  questions: PublicQuestion[];
};

type TeacherAnswerKey = {
  schema_version: '1.0';
  batch_id: string;
  student_id: string;
  quiz_id: string;
  exam_version: number;
  public_quiz_hash: string;
  questions: TeacherQuestionKey[];
  source_sha256: string;
};

type StudentSubmission = {
  schema_version: '1.0';
  batch_id: string;
  student_id: string;
  quiz_id: string;
  exam_version: number;
  public_quiz_hash: string;
  answers: {
    question_id: string;
    value: string | string[];
  }[];
  submitted_at_client?: string; // 參考用，不可信
};

type GradingResult = {
  schema_version: '1.0';
  batch_id: string;
  student_id: string;
  quiz_id: string;
  total_score: number;
  max_score: number;
  status: 'auto_graded' | 'needs_review' | 'approved';
  per_question: {
    question_id: string;
    earned_points: number;
    max_points: number;
    feedback: string;
    rubric_assessment?: {criterion_id: string; earned_points: number; reason: string}[];
    confidence?: number; // 0..1; optional, self-reported not calibrated
    review_required: boolean;
  }[];
  teacher_overrides: {question_id: string; before: number; after: number; reason: string; updated_at: string}[];
};
```

- 考卷檔和教師 keys **必須物理分開**；不可以只是 CSS 隱藏解答或把 key base64 編碼在學生 HTML 裡。
- `public_quiz_hash` 應由 canonical serialized public quiz (不含 hash 欄) 經 SHA-256 計算，教師包與學生答案卷皆記錄；**它只用於版本一致性，不是防竄改的數位簽章**。
- JSON 與 Markdown 學生答案必須含這五個匹配欄位：`schema_version`, `batch_id`, `student_id`, `quiz_id`, `public_quiz_hash`；另需 `exam_version` 及逐題 `question_id`。
- 若收到格式錯誤、未知問題、重複 question_id、hash 不同、超出答案選項的 ID，列為錯誤或人工處理，**不能**靜默給零分或錯配他人試卷。

### 6.2 localStorage / IndexedDB

`localStorage` keys（單一 namespace，所有寫入都包 try/catch）：

```text
aihwq.settings.v1          // provider/model/base_url/UI/theme/language/question settings
aihwq.keys.v1              // 教師選擇記住的各 provider API Key；可選加密模式
aihwq.activeBatch.v1       // 最近的 batch_id 及頁面
aihwq.studentDraft.<quiz_id>  // 只有學生獨立 HTML 使用
```

IndexedDB `aihwq-db`, stores：`batches`, `students`, `sources`, `sourceBlocks`, `conceptMaps`, `quizzes`, `teacherKeys`, `submissions`, `gradeResults`, `jobs`, `auditTrail`。避免將全部原始 PDF Blob 放入 localStorage。作業保存狀態跨重整恢復，已完成項目不得重送 API；進行中請求中斷後標為可重試。

## 7. 批次任務佇列

- 預設並行度 **2**（教師可選 1–4）；單份作業內的依賴必須先分類/提概念，再生成題目。不得同時為 60 人無限制打 API。
- job key：`batch_id/student_id/stage/plan_version`，以 IndexedDB durable checkpoint 記錄 `queued/running/completed/retryable_failed/fatal_failed/cancelled`、attempts、錯誤摘要與結果。
- HTTP 429/503/timeout 指數退避加 jitter，優先遵從 Retry-After；其他 4xx（如 401、403）停止並顯示錯誤，不要無限重試。最大重試 3 次（產題補題 3 輪另計）。可手動只重新跑失敗者。
- 暫停僅不啟動新請求；取消用 AbortController 終止支援的請求，保留已完成資料。避免瀏覽器崩潰時「看似已完成但未存檔」。
- 可顯示各人進度、總完成數、重試次數、API 用量（若 API 有提供）；未回傳用量時不可偽稱精準費用。
- 每一個供應商連線測試需小量實際呼叫並區分 invalid key / quota / API error / CORS / timeouts。

## 8. 匯出 ZIP 與命名規範

### 8.1 學生試卷包 `student_exams_<batchId>.zip`

```text
student_exams_<batchId>/
  README.txt
  manifest.json                # student_id, quiz_id, exam_version, quiz hash, file path; 無解答
  exams/
    S001_<quizId>.html
    S002_<quizId>.html
    ...
```

### 8.2 教師答案包 `teacher_keys_<batchId>.zip`

```text
teacher_keys_<batchId>/
  manifest.json                # 附版本、hash 與個別檔路徑
  keys/
    S001_<quizId>_key.json     # 選擇題正解、問答 rubric、解析與 source_refs
    S002_<quizId>_key.json
  review/
    S001_<quizId>_review.html  # 人可讀/可列印；須教師端管理
```

### 8.3 學生交卷

檔名建議 `S001_<quizId>_answers.json`、`S001_<quizId>_answers.md`。JSON 是**標準且唯一保證完整無損**的機器評分輸入；MD 以固定 frontmatter + 各題 `question_id` 結構生成，開發端可解析；PDF 是可列印備份且僅對本系統產製、可擷取文字 PDF 提供 best-effort 匯入，不應取代 JSON 作為主要批改來源。

### 8.4 批改結果包 `grading_<batchId>.zip`

```text
grading_<batchId>/
  summary.csv                  # student_id,total,max,level breakdown,status
  summary.json
  results/
    S001_<quizId>_result.json
    S001_<quizId>_report.html
  needs_review.csv
```

### 8.5 專案備份包

將批次設定、對應表、source block/原始附件（使用者勾選才包含）、題目、key、作答、批改、人工覆核紀錄打包。**永遠不含 API Key**。可從 ZIP 匯回 IndexedDB，檢查 schema_version 和相同 batch ID 衝突時提供覆寫/另存，而不是默默蓋掉。

## 9. 學生 HTML 規格詳述

- 檔案本身應是完整 HTML5，內嵌 minimal CSS + vanilla JS + 無正解的 public quiz JSON；HTML 由教師端 generator 產生，使用可信任的 JSON 編碼器安全嵌入（應防止 `</script>` 字串閉合、特殊 HTML 輸入 XSS）。
- 建議左側題號瀏覽/右側題目作答，響應式手機版；導覽與鍵盤操作符合基本 WCAG（label、focus、語意按鈕、對比度）。
- 先填或確認學生 ID（不可由輸入任意重定 quiz_id）；可自行更改姓名欄位但不得改變識別碼。
- 每次更動在支援 localStorage 時立即草稿 autosave，含 key `aihwq.studentDraft.${quiz_id}`；若 `file://` 來源的 localStorage 不可用，必須提供匯出/匯入草稿 JSON，並持續提示教師或學生不應將重新整理視為安全。交卷時確認是否有空白題、避免重覆下載造成混淆；允許重新匯出相同答案，不應任意宣稱已透過伺服器繳交。
- 導出 Markdown 要處理 multiline、code fence 與特殊文字，解析時用 canonical question ID，不能依「第 3 題」或標題模糊對應。
- 列印 CSS 包含每題題幹與學生答案及 meta；長問答跨頁時不截斷。教師端從 PDF 抽取答案若無法可靠還原，提示交 JSON/MD。

## 10. 批改設計

### 10.1 匯入 / 配對

- 匯入一批答案（多選、ZIP、拖曳）及答案包（或使用同一次建立的 IndexedDB key）；檢視 match table：`matched`, `missing_key`, `missing_submission`, `version_mismatch`, `duplicate`, `unsupported_pdf`, `parse_error`。
- 同一學生出現多份答案時必須顯示差異並讓教師選，不能自動選「最後檔」。教師可以匯入後人工更改學生 ID/quiz 對應，但要有可追溯操作紀錄。
- 驗證各來源 `quiz_id+public_quiz_hash+question_id` 全部相符，分數上限由 teacher key/quiz 取得，不信任學生檔內自行宣稱的分數、解答、rubric。

### 10.2 選擇題

- 完全在本機程式評分，不必送 AI、不浪費 API 成本。單選 ID 完全相同得分；複選採 set equality 完全相符得分；空白 0 分。無效 ID 需警示而不是讓 AI 幫忙猜。

### 10.3 問答題

- 一題一評或小批 JSON structured scoring。傳送：題目、學生答案、教師 rubric、必要參考依據摘要，不送其他學生資料或含隱私的多餘上下文。
- 每 rubric criterion 回傳 `earned_points`、理由、引用學生回答片段、`feedback`、`review_required`；模型**不自行決定題目總配分**，分數在每項範圍內並由本機程式裁切/驗證再計算。
- 回答合理但未採用標準範例的同義/等價推論必須容許；不能根據語氣、寫作流暢度或模型推定「疑似 AI 產生」扣分。
- 若缺少 rubric、未作答、模型格式不合法、引文不一致、信心低或評分落在爭議區間，標記 `needs_review`。信心為模型自評，**只作提示、不作校準機率**；教師改分需記錄原分、改分、時間與原因。
- `final_score` 由本地加總並使用一致的 rounding policy；各題及各層配分加總必須等於總分。

### 10.4 評量層次與報告

- 顯示理解 (`comprehension`)、推理/應用 (`reasoning`)、設計取捨 (`design_tradeoff`) 三項得分率與可回顧題目。
- 可設門檻：`掌握良好` ≥ 80%、`部分掌握` 55–79.99%、`仍需加強` <55%；若高階層次分數低則另顯示「高階推理仍可加強」而不是推斷作弊或作者身份。
- 報表包含教師標記、AI 建議、疑義題、問答批改依據、總分、各層分數、人工異動紀錄。

## 11. 安全、隱私與可靠性

- 教師金鑰不可嵌入已發布網頁的 JS bundle 或 GitHub 原始碼；系統不得將任何金鑰送往非教師選擇的 provider host。
- 從使用者上傳文字產生的 HTML 一律使用 DOM API textContent 或安全轉義；禁止未淨化的 `innerHTML`。第三方依賴固定版本，部署時不需要外部執行 CDN。
- 檔案上傳限制採可設定（初版單檔 10 MiB、批次 100 檔、總檔案 200 MiB 作為 UI 建議限制，不代表所有裝置都能處理）；需預估剩餘容量，阻止當機與提示分批匯入。
- `localStorage` 典型容量有限，需 catch `QuotaExceededError`；大量內容放 IndexedDB，視情況呼叫 `navigator.storage.persist()`，仍要提供 ZIP 備份。
- 文字送至 AI 前可剔除學生姓名、學號，改用匿名暫時 ID；教學評量前取得適當告知與個資規範遵循；API 傳輸使用 HTTPS。
- 如學生在作業中加入提示詞注入，無論是檔案、程式碼註解或 PDF 均只作被分析資料，系統指令不得被修改；驗證每個輸出 JSON 格式與內容。
- 提供生成成本/進度、429 retry、失敗記錄與局部補跑，防止批次全部重做而重複扣費。
- 明確保留並顯示：本地 browser 儲存可能清除、瀏覽器端 API Key 有風險、離線 HTML 無防作弊保證、AI 評分需要教師覆核。

## 12. 建議 repo 結構

```text
/
  AGENTS.md
  DEVELOPMENT_SPEC.md
  PROMPTS_REVISED.md
  README.md
  package.json
  index.html
  vite.config.ts
  .github/workflows/deploy.yml
  public/
  src/
    app/                   # routes and layout
    components/            # upload/queue/questions/results
    features/settings/
    features/batch-import/
    features/concepts/
    features/quiz-generation/
    features/quiz-review/
    features/student-export/
    features/grading/
    features/reporting/
    providers/
      types.ts
      openai.ts
      gemini.ts
      xai.ts
      cgu.ts
      api-tests.ts
    parsers/
      pdf.ts
      text.ts
      code.ts
      notebook.ts
    persistence/
      localSettings.ts
      indexedDb.ts
    domain/
      schemas.ts
      types.ts
      validation.ts
      scoring.ts
      matching.ts
    workers/                # optional PDF/ZIP parsing and costly transformations
    templates/
      student-standalone.html
    lib/
  tests/
    unit/
    integration/
    e2e/
  docs/
```

開發工具建議：PDF.js、JSZip、Dexie（IndexedDB）、Zod/Ajv（資料驗證）、Vitest、Playwright。不同依賴的授權與瀏覽器相容性請實際確認，不要為了簡單工具加入整套伺服器。

## 13. Codex 分期開發（每期必須可操作）

**Phase 0｜技術可行性驗證（先做）**
- 建立 Vite/React/TS 專案、GitHub Actions、GitHub Pages `/RepoName/` 路徑。
- provider adapter skeleton、各供應商連線測試、從真實 GitHub Pages origin 驗證 CORS（API Key 須由使用者輸入，CI 不應接觸）。
- 只要 CGU 或其他 API 無法在瀏覽器呼叫，明列為 blocker；不以模擬成功替代。提供 MockProvider 供其他功能繼續開發。

**Phase 1｜教師匯入 + 本機儲存**
- 設定、拖曳多檔、格式檢查、學號 mapping、PDF/程式/text 解析、IndexedDB 復原、批次管理、ZIP 檔案匯入。

**Phase 2｜出題核心 + 審題**
- prompts、概念萃取、層次題型配置、AI 生成、JSON 驗證、去重、補題、重試、可暫停佇列、逐人題目編輯/批准。

**Phase 3｜學生版 + 教師解答包**
- 產生單一離線 HTML、學生端草稿保存、JSON/MD 匯出、列印 PDF；教師 key JSON/HTML 單獨生成，兩種 ZIP；驗證學生包沒有解答或 API Key。

**Phase 4｜批次回收與批改**
- 答卷與教師 key 配對、選擇題本機評分、問答題 AI rubric 評閱、人工覆核、異動紀錄、報表與 ZIP 下載。

**Phase 5｜安全與驗收**
- 測試 CORS、XSS、prompt injection、無 key 洩漏、重大錯誤恢復、200MB 限制提示、掃描 PDF 警告、資料備份/恢復、學生離線測試、可及性。

## 14. 驗收測試（Definition of Done）

1. 能在 GitHub Pages 上開啟並重整，不出現 404、資源 base path 或 router 問題。
2. 同一批 30 份 PDF/TXT/MD/程式檔能上傳，解析 30 位學生，重複 ID 與解析失敗能提示；不能靜默覆寫。
3. 30 位每人各一份題目，至少具單選/複選/簡答；每題可查到源文且不考變數名/數值背誦；教師能逐題編輯、批准。
4. 生成/批改中重新整理：已完成結果保留；失敗項能只重試，不整批再扣費；暫停/取消有效。
5. 可一次下載 30 個 `.html` 和 30 個答案 `.json`；任選一個 HTML **拔掉網路仍能正常答題與輸出 JSON/MD/PDF 列印**；若本機 file:// 無法存草稿仍須允許匯出/匯入 JSON 草稿。
6. 解壓縮學生版並全文搜尋指定標準答案、rubric 特徵及 API Key，沒有洩漏；教師版 keys 有答案、explanation、rubric、source refs。
7. 30 位學生提交 JSON，匯入後 30 筆精確匹配；重複/錯 hash/其他批次答案不會誤批改。
8. 選擇題分數與人工預期一致；問答題 AI 必須可覆核、改分可留下 audit trail；成績 CSV 各項加總正確。
9. 無 AI Key、CORS 錯誤、429、API JSON 破損、掃描 PDF、空檔、離線 HTML 的 localStorage 被阻擋均有明確 UI 錯誤，不應崩潰或假裝成功。
10. 關閉重開瀏覽器後設定、key（如果教師選擇儲存）、資料可復原；提供完整可還原的本地備份包，且備份包不含 key。

## 15. 目前需以測試確認的外部限制

1. **GitHub Pages**：僅靜態內容，不能沿用原 PHP 程式端點。
2. **各供應商 Browser CORS**：無法單靠前端保證；若認證 header 不被允許，無後端方案下就不可呼叫。
3. **BYOK 金鑰**：localStorage 跨重整持續，但不是適合高價值密鑰的安全倉庫；個人設備與受限額度更適合。
4. **瀏覽器儲存**：localStorage 一般上限約 5 MiB/源，IndexedDB 適合大檔，但仍可能被清除或空間回收；要定期備份。
5. **PDF 回收**：PDF 單靠文字擷取難保證任意學生修改的檔案都能可靠配對；以 JSON 為首選，標準版 MD 次之，PDF 為列印與必要時人工批改。
6. **單次提交限制**：離線 HTML 的鎖定無法提供權威驗證，需教師端決定採計哪一份提交。

## 16. 實作參考（非產品執行階段使用）

- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- Browser localStorage / IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
- file:// localStorage 限制: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- Storage quotas: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- Browser CORS: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- OpenAI JS browser security: https://developers.openai.com/api/reference/typescript
- Gemini REST API: https://ai.google.dev/api
- Gemini structured outputs: https://ai.google.dev/gemini-api/docs/structured-output
- xAI API: https://api.x.ai/docs/

