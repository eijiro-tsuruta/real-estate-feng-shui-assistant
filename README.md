# 不動産営業向け 風水説明レポートAI

間取り図をOpenAIの画像入力で読み取り、不動産・注文住宅・リフォームの担当者が顧客へ説明するための穏やかな風水参考レポートを生成するNext.jsアプリです。

## セットアップ

```bash
npm install
cp .env.example .env.local
```

`.env.local` の `OPENAI_API_KEY` にOpenAI APIキーを設定します。案件保存も使う場合は、Neonの接続プール付きURLを `DATABASE_URL` に設定し、マイグレーションを適用します。

```bash
npm run db:migrate
```

その後、開発サーバーを起動します。

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

- `/`：サービス紹介LP
- `/product`：間取り図の解析・レポート作成画面
- `/sample-floorplan.png`：LPとプロダクト画面からダウンロードできるサンプル間取り図

APIキーを設定していない場合でも、「サンプルレポートを見る」から、間取り図と完成レポートの一連の表示を確認できます。このサンプル機能はOpenAI APIを呼び出さず、料金は発生しません。

## Neonでの案件保存

LINE版プラスの案件状態はNeon Postgresへ保存します。スキーマはDrizzleで管理し、次の9テーブルを使用します。

- `professionals`、`customers`、`cases`
- `case_assets`、`ai_generations`
- `confirmation_questions`、`confirmation_answers`
- `reports`、`line_events`

`case_assets` には画像そのものではなく、非公開Object Storage上のオブジェクトキー、MIMEタイプ、サイズ、SHA-256、削除期限を保存します。バケット名は `NEON_STORAGE_BUCKET` で指定します。画像アップロード処理はLINE連携と同時に追加する予定です。

スキーマ変更時は次の順に実行します。

```bash
npm run db:generate
npm run db:check
npm run db:migrate
```

本番用の `DATABASE_URL`、OpenAI APIキー、将来追加するObject Storage認証情報は、Vercelのサーバー環境変数だけへ登録してください。値をGitへコミットしたり、`NEXT_PUBLIC_` を付けたりしないでください。

## 公開設定

本番ビルドでは、安全のため初期状態で実画像のAI解析を停止します。実解析を提供する場合は、Vercel Production環境へ `OPENAI_API_KEY` を登録したうえで、次の2つのフラグをどちらも `true` にします。

```text
ENABLE_LIVE_ANALYSIS=true
NEXT_PUBLIC_ENABLE_LIVE_ANALYSIS=true
```

無料公開を停止するときは、どちらか一方を `false` に戻します。ローカルの `npm run dev` では、この公開設定にかかわらず実解析を利用できます。

北マークが小さい場合や図面に記載がない場合は、入力画面の「北方向の指定」で、斜めを含む8方向から北を手動補正できます。色付きの注釈矢印は方位磁針と区別するようOpenAIへの指示にも含めています。

AIによる北方向の自動認識は参考判定です。自動認識で作成したレポートには確認警告を表示し、手動補正して再生成できるようにしています。営業資料として使用する前に、図面の方位記号と必ず照合してください。

## セキュリティとプライバシー

- APIキーはサーバー環境変数だけで扱い、ブラウザへ公開しません。
- JPEG、PNG、WebPのみ、最大4MBに制限し、MIMEタイプとファイル署名を検査します。
- Vercel Functionsの4.5MB制限を超えないよう、リクエスト全体のサイズも事前検査します。
- 解析APIは同一生成元を確認し、簡易レート制限を行います。
- AI出力はZodで構造と最大長を検証してから画面へ渡します。
- OpenAI APIはアプリ側で自動再試行せず、テスト中の意図しない重複課金を防ぎます。
- 本番では2つの明示的な機能フラグが揃わない限り、実解析を停止します。
- 案件状態と生成レポートはNeonへ保存し、画像は非公開Object Storageへ分離します。保存期限を持たせ、期限切れ画像を削除できる設計です。
- セキュリティヘッダー、CSP、APIレスポンスの `no-store` を設定しています。
- 画像内の文字は信頼できないデータとして扱い、プロンプトインジェクション対策をプロンプトへ含めています。

注意：現在のレート制限は単一プロセス内の簡易実装です。本番で複数インスタンスを使用する場合は、Vercel FirewallまたはRedis等の共有ストアへ置き換えてください。認証機能も本番公開前に追加してください。

## 確認コマンド

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:check
```

詳細なプロジェクト方針は `AGENTS.md` を参照してください。

## LINE版プラスの案件フロー

`lib/professional-case.ts` が、プロから顧客へ発行するLINE案件の状態を管理します。

- 不動産・注文住宅：間取り図を必須とし、プロが読み取り結果を確認してから室内写真へ進みます。
- リフォーム・プロ鑑定：北側写真から開始し、間取り図は任意で追加できます。
- 標準テーマは「住宅の基本状態＋金運」です。恋愛運は案件作成時に希望された場合だけ追加します。
- 写真は北→東→南→西の順に受け付け、用途不明の物がある場合は回答が揃うまで次へ進みません。
- 4方向が完了しても自動納品せず、必ずプロ確認を経てから納品済みにします。

状態遷移は純粋なドメインロジックとして実装し、Neonへの保存・復元をリポジトリ層で分離しています。LINE Webhookの安全な受信・重複防止まで実装済みで、次の実装対象は非公開Object Storageへの画像保存、イベント処理、自動返信、プロ確認画面との接続です。

### LINE Webhook受信

Webhook URLは `/api/line/webhook` です。`LINE_CHANNEL_SECRET` を使って、生のリクエスト本文と `x-line-signature` をLINE公式SDKで検証します。検証後は、イベント本文を保存せず、イベントID、ユーザーID、メッセージID、種類、本文全体のSHA-256だけを `line_events` に記録します。

`webhookEventId` が主キーのため、Webhook再送時も二重登録されません。LINE Developers Consoleの接続確認で送られる空イベントにもHTTP 200を返します。写真取得と自動返信は、Object Storage接続後に `received` 状態のイベント処理として追加します。
