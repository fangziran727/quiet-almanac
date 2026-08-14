# 体育场馆预订系统消息页

这是一个无后端、零构建的静态前端复刻页，可直接放到 GitHub Pages 部署。

## 本地打开

直接双击 `index.html`，或用浏览器打开本目录下的 `index.html`。

## 页面规则

- 消息按 4 天展示，每天两条：游泳池 16:30、健身房 16:00。
- 两条消息分别发送：第一条在 `09:00`~`10:00`，第二条与第一条间隔 20 分钟~2 小时，且不晚于 `13:00`；发送时间按日期稳定生成。
- 时间标签按微信逻辑显示：当天只显示时间，昨天显示 `昨天 HH:mm`，2~6 天内显示 `星期X HH:mm`，7 天及以上显示 `M月d日 HH:mm`（跨年加年份）。
- 页面已配置 `noindex` 与 `robots.txt`，搜索引擎不会收录。
- 预约日期会根据打开页面时浏览器的当天日期自动变化。

## GitHub Pages 快速部署

1. 在 GitHub 新建一个仓库。
2. 上传本目录里的 `index.html`、`styles.css`、`app.js`、`README.md` 和 `.github/workflows/pages.yml`。
3. 进入仓库 `Settings` -> `Pages`。
4. `Build and deployment` 选择 `GitHub Actions`。
5. 回到 `Actions` 等待 `Deploy static site to Pages` 完成。
6. 部署成功后，GitHub 会在 `Settings` -> `Pages` 显示访问链接。
