# Homework Quiz

瀏覽器本機運作的教師批次個別化測驗工作台。它依照 `DEVELOPMENT_SPEC.md` 將作業來源、學生試卷與教師答案包分離，支援離線學生 HTML、JSON/Markdown 作答格式、客觀題本機評分，以及可插拔的 OpenAI、Gemini、xAI 與 CGU provider。

## 開發

```bash
npm install
npm run dev
npm run build
npm test
```

部署產物是 `dist/`，GitHub Pages workflow 會以 repository 子路徑部署。API key 沿用參考專案的 provider 分開保存機制，使用 `meetingtutor.api-keys.v1` 與 `meetingtutor.model-config.v1`，支援顯示/隱藏、切換 provider 後還原、以及一鍵清除；不會進入學生 HTML、ZIP、URL 或 log。離線試卷不提供伺服器提交或防作弊保證。

離線示範模式可先匯入 TXT、Markdown 或程式碼並建立試卷。真正 AI 出題的 provider adapter、prompt builder 與 JSON 驗證位於 `src/providers`、`src/features/quiz-generation` 和 `src/domain`，可在供應商允許瀏覽器 CORS 時接上。

## License

[![Creative Commons License](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

Unless otherwise stated, the project documentation, prompts, and other original content in this repository are licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/). You may share and adapt the material for non-commercial purposes with appropriate attribution, and adaptations must be distributed under the same license. Third-party dependencies remain under their respective licenses.
