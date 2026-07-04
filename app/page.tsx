"use client";

import {
  ChangeEvent,
  FormEvent,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KuaProfile } from "@/lib/kua";
import {
  REPORT_DISCLAIMER,
  type FengShuiReport,
} from "@/lib/report-schema";
import {
  formatFileSize,
  optimizeFloorPlanImage,
} from "@/lib/image-optimization";
import { isLiveAnalysisEnabled } from "@/lib/live-analysis";
import { sampleReport } from "@/lib/sample-report";

type ApiResult = {
  report: FengShuiReport;
  kua: KuaProfile | null;
  demo?: boolean;
  northSource?: "ai" | "manual";
};

const steps = [
  ["01", "図面を選ぶ"],
  ["02", "AIが配置を整理"],
  ["03", "説明レポート完成"],
];

const loadingSteps = [
  ["画像を送信用に軽量化", "図面の見やすさを保ちながら通信量を抑えます"],
  ["画像を安全に送信", "形式と容量をサーバーでも再確認します"],
  ["AIが方位と部屋配置を確認", "通常はこの工程に最も時間がかかります"],
  ["説明文を整えてレポート化", "良い点と改善策を短くまとめます"],
];

const liveAnalysisEnabled = isLiveAnalysisEnabled(
  process.env.NODE_ENV,
  process.env.NEXT_PUBLIC_ENABLE_LIVE_ANALYSIS,
);

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" />
    </svg>
  );
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [optimizationNote, setOptimizationNote] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);

  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : ""),
    [file],
  );

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function selectFile(selected?: File) {
    setError("");
    setResult(null);
    setOptimizationNote("");
    if (!selected) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError("JPEG、PNG、WebPの画像を選択してください。");
      return;
    }
    if (selected.size > 4_000_000) {
      setError("画像サイズは4MB以下にしてください。");
      return;
    }
    setFile(selected);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!liveAnalysisEnabled) {
      setError("公開デモでは実画像のAI解析を停止しています。サンプルレポートをご覧ください。");
      return;
    }
    if (!file || loading) {
      if (!file) setError("間取り図の画像を選択してください。");
      return;
    }

    setLoading(true);
    setLoadingStep(0);
    setOptimizationNote("");
    setError("");
    setResult(null);
    const formData = new FormData(event.currentTarget);
    const timers: number[] = [];

    try {
      const uploadFile = await optimizeFloorPlanImage(file);
      if (uploadFile !== file) {
        setOptimizationNote(
          `${formatFileSize(file.size)} → ${formatFileSize(uploadFile.size)}に軽量化しました`,
        );
      }
      formData.set("image", uploadFile);
      setLoadingStep(1);
      timers.push(
        window.setTimeout(() => setLoadingStep(2), 3_000),
        window.setTimeout(() => setLoadingStep(3), 22_000),
      );

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const payload = (await response.json()) as ApiResult & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "レポートを作成できませんでした。");
      }
      setResult(payload);
      window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "通信エラーが発生しました。もう一度お試しください。",
      );
    } finally {
      timers.forEach((timer) => window.clearTimeout(timer));
      setLoading(false);
    }
  }

  function showSampleReport() {
    setError("");
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
    setResult({ report: sampleReport, kua: null, demo: true });
    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#" aria-label="住まいの方位レポート ホーム">
          <span className="brand-mark">
            <CompassIcon />
          </span>
          <span>
            <strong>住まいの方位レポート</strong>
            <small>FOR REAL ESTATE PROFESSIONALS</small>
          </span>
        </a>
        <span className="header-note">不動産営業向け・説明支援ツール</span>
      </header>

      <section className="hero">
        <div className="eyebrow">
          <span />
          間取りから、会話のきっかけを。
        </div>
        <h1>
          風水の質問に、
          <br />
          <em>やさしく答える。</em>
        </h1>
        <p className="hero-copy">
          間取り図をアップロードするだけ。AIが方位と部屋配置を読み取り、
          <br className="desktop-only" />
          商談でそのまま使える、穏やかな説明レポートを作成します。
        </p>
        <div className="step-row" aria-label="利用の流れ">
          {steps.map(([number, label], index) => (
            <div className="step" key={number}>
              <span>{number}</span>
              <strong>{label}</strong>
              {index < steps.length - 1 && <i aria-hidden="true">→</i>}
            </div>
          ))}
        </div>
      </section>

      <section className="workspace" aria-labelledby="form-title">
        <div className="workspace-intro">
          <span className="section-number">01</span>
          <div>
            <h2 id="form-title">物件情報を入力</h2>
            <p>必須なのは間取り図だけです。個人情報は入力しないでください。</p>
          </div>
        </div>

        {!liveAnalysisEnabled && (
          <aside className="demo-only-notice">
            <strong>料金ゼロのサンプル専用デモです</strong>
            <p>
              公開環境では画像送信とClaude APIを停止しています。「サンプルレポートを見る」から操作感をご確認ください。
            </p>
          </aside>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="upload-column">
              <label className="field-label">
                間取り図 <span>必須</span>
              </label>
              <div
                className={`drop-zone ${dragging ? "is-dragging" : ""} ${preview ? "has-preview" : ""}`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  selectFile(event.dataTransfer.files[0]);
                }}
              >
                {preview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="選択した間取り図のプレビュー" />
                    <div className="preview-overlay">
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                      >
                        画像を変更
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    className="drop-action"
                    type="button"
                    onClick={() => inputRef.current?.click()}
                  >
                    <span className="upload-icon">
                      <UploadIcon />
                    </span>
                    <strong>間取り図をここにドロップ</strong>
                    <span>またはクリックしてファイルを選択</span>
                    <small>JPEG / PNG / WebP・最大4MB</small>
                  </button>
                )}
                <input
                  ref={inputRef}
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    selectFile(event.target.files?.[0])
                  }
                />
              </div>
              {file && <p className="file-name">選択中：{file.name}</p>}
            </div>

            <div className="details-column">
              <div className="field">
                <label htmlFor="propertyName">物件名・管理名</label>
                <input
                  id="propertyName"
                  name="propertyName"
                  maxLength={100}
                  placeholder="例：青山レジデンス 203号室"
                  autoComplete="off"
                />
                <small>レポートの見出しにのみ使用します（任意）</small>
              </div>

              <div className="field">
                <label htmlFor="northOverride">
                  北方向の指定 <span className="optional-label">任意</span>
                </label>
                <select
                  id="northOverride"
                  name="northOverride"
                  defaultValue="auto"
                >
                  <option value="auto">AIが北マークを読み取る</option>
                  <option value="up">図面の上が北</option>
                  <option value="upRight">図面の右上が北</option>
                  <option value="right">図面の右が北</option>
                  <option value="downRight">図面の右下が北</option>
                  <option value="down">図面の下が北</option>
                  <option value="downLeft">図面の左下が北</option>
                  <option value="left">図面の左が北</option>
                  <option value="upLeft">図面の左上が北</option>
                </select>
                <small>
                  北マークが小さい・ない場合は、斜めを含む8方向から指定できます。
                </small>
              </div>

              <fieldset>
                <legend>
                  お客様に合わせた方位傾向 <span>任意</span>
                </legend>
                <p className="field-help">
                  生年と性別の両方を入力すると、八宅派の簡易的な本命卦を反映します。
                </p>
                <div className="inline-fields">
                  <div className="field">
                    <label htmlFor="birthYear">生年（西暦）</label>
                    <input
                      id="birthYear"
                      name="birthYear"
                      inputMode="numeric"
                      pattern="[0-9]{4}"
                      maxLength={4}
                      placeholder="例：1985"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="gender">性別</label>
                    <select id="gender" name="gender" defaultValue="">
                      <option value="">選択しない</option>
                      <option value="male">男性</option>
                      <option value="female">女性</option>
                    </select>
                  </div>
                </div>
                <p className="privacy-note">
                  氏名・住所・連絡先など、個人を特定できる情報は入力しないでください。
                </p>
              </fieldset>
            </div>
          </div>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <div className="submit-row">
            <div className="submit-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={loading || !liveAnalysisEnabled}
              >
                {loading ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    レポートを作成中…
                  </>
                ) : liveAnalysisEnabled ? (
                  <>
                    レポートを作成する
                    <span aria-hidden="true">→</span>
                  </>
                ) : (
                  <>公開デモではAI解析を停止中</>
                )}
              </button>
              <button
                className="sample-button"
                type="button"
                onClick={showSampleReport}
                disabled={loading}
              >
                サンプルレポートを見る
                <small>API料金はかかりません</small>
              </button>
            </div>
            <p>画像はレポート生成のためにのみ送信され、このアプリには保存しません。</p>
          </div>

          {loading && (
            <div
              className="analysis-progress"
              role="status"
              aria-live="polite"
              aria-label="レポート作成の進捗"
            >
              <ol>
                {loadingSteps.map(([title, description], index) => (
                  <li
                    key={title}
                    className={
                      index < loadingStep
                        ? "is-complete"
                        : index === loadingStep
                          ? "is-active"
                          : ""
                    }
                  >
                    <span aria-hidden="true">
                      {index < loadingStep ? "✓" : index + 1}
                    </span>
                    <div>
                      <strong>{title}</strong>
                      <small>{description}</small>
                    </div>
                  </li>
                ))}
              </ol>
              {optimizationNote && <p>{optimizationNote}</p>}
              <small className="progress-note">
                画面を閉じずにお待ちください。画像の内容により30〜60秒ほどかかる場合があります。
              </small>
            </div>
          )}
        </form>
      </section>

      {result && (
        <ReportResult
          ref={resultRef}
          result={result}
          imageUrl={result.demo ? "/sample-floorplan.svg" : preview}
        />
      )}

      <section className="principles">
        <p className="eyebrow">
          <span />
          このツールが大切にしていること
        </p>
        <div className="principle-grid">
          <article>
            <strong>01</strong>
            <h3>断定しない</h3>
            <p>「一般的な考え方では」と、参考情報であることを明確にします。</p>
          </article>
          <article>
            <strong>02</strong>
            <h3>不安を煽らない</h3>
            <p>気になる点だけで終わらず、暮らしに取り入れやすい工夫を添えます。</p>
          </article>
          <article>
            <strong>03</strong>
            <h3>会話につなげる</h3>
            <p>専門鑑定ではなく、顧客との対話を助ける柔らかな言葉を選びます。</p>
          </article>
        </div>
      </section>

      <footer>
        <div className="brand footer-brand">
          <span className="brand-mark">
            <CompassIcon />
          </span>
          <span>
            <strong>住まいの方位レポート</strong>
            <small>FOR REAL ESTATE PROFESSIONALS</small>
          </span>
        </div>
        <p>{REPORT_DISCLAIMER}</p>
      </footer>
    </main>
  );
}

const ReportResult = forwardRef<
  HTMLElement,
  { result: ApiResult; imageUrl: string }
>(function ReportResult({ result, imageUrl }, ref) {
  const { report, kua } = result;
  return (
    <section className="report-wrap" ref={ref} aria-labelledby="report-title">
      <div className="report-toolbar no-print">
        <div>
          <span className="section-number">02</span>
          <h2 id="report-title">説明レポート</h2>
        </div>
        <button type="button" onClick={() => window.print()}>
          印刷・PDF保存
        </button>
      </div>

      <article className="report">
        <header className="report-header">
          <p>住まいの方位レポート</p>
          {result.demo && <b className="demo-badge">サンプルデモ</b>}
          <h2>{report.propertySummary}</h2>
          <span>一般的な風水・八宅派の考え方による参考情報</span>
        </header>

        <div className="report-overview">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="解析した間取り図" />
          )}
          <div>
            <h3>間取りの読み取り結果</h3>
            <p>{report.reading.summary}</p>
            <dl>
              <div>
                <dt>北マーク</dt>
                <dd>{report.reading.north}</dd>
              </div>
              <div>
                <dt>読み取り確度</dt>
                <dd>{report.reading.confidence}</dd>
              </div>
            </dl>
          </div>
        </div>

        {!result.demo && (
          <aside
            className={`north-verification ${
              result.northSource === "manual" ? "is-confirmed" : "needs-check"
            }`}
          >
            <div>
              <strong>
                {result.northSource === "manual"
                  ? "北方向は手動指定済みです"
                  : "AIが読み取った北方向を必ずご確認ください"}
              </strong>
              <p>
                {result.northSource === "manual"
                  ? "営業担当者が指定した方向を優先して、方位別配置を作成しています。"
                  : "小さな方位針や注釈入り図面では、AIが針の向きを誤認する場合があります。異なる場合は北方向を手動指定して再生成してください。"}
              </p>
            </div>
            {result.northSource !== "manual" && (
              <button
                type="button"
                className="no-print"
                onClick={() => {
                  const select = document.getElementById(
                    "northOverride",
                  ) as HTMLSelectElement | null;
                  select?.scrollIntoView({ behavior: "smooth", block: "center" });
                  window.setTimeout(() => select?.focus(), 450);
                }}
              >
                北方向を補正する
              </button>
            )}
          </aside>
        )}

        {kua && (
          <section className="kua-card">
            <span>簡易本命卦</span>
            <strong>
              {kua.number}・{kua.trigram}
            </strong>
            <p>
              {kua.group}／吉方位の傾向：{kua.favorableDirections.join("・")}
            </p>
            <small>{kua.note}</small>
          </section>
        )}

        <section className="report-section">
          <p className="report-kicker">DIRECTION MAP</p>
          <h3>方位別の部屋・設備配置</h3>
          <div className="direction-grid">
            {report.placements.map((placement) => (
              <div key={placement.direction}>
                <strong>{placement.direction}</strong>
                <p>{placement.rooms.join("・") || "読み取りなし"}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="report-section">
          <p className="report-kicker">POSITIVE POINTS</p>
          <h3>風水観点で見た良い点</h3>
          <div className="point-list positive-list">
            {report.positives.map((point, index) => (
              <article key={`${point.title}-${index}`}>
                <span>✓</span>
                <div>
                  <h4>{point.title}</h4>
                  <p>{point.explanation}</p>
                  {point.directions.length > 0 && (
                    <small>{point.directions.join("・")}</small>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="report-section">
          <p className="report-kicker">POINTS TO CONSIDER</p>
          <h3>気になる点と、取り入れやすい工夫</h3>
          <div className="concern-list">
            {report.concerns.length === 0 ? (
              <p>図面から特に大きく気になる点は読み取られませんでした。</p>
            ) : (
              report.concerns.map((concern, index) => (
                <article key={`${concern.title}-${index}`}>
                  <div className="concern-copy">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h4>{concern.title}</h4>
                      <p>{concern.explanation}</p>
                    </div>
                  </div>
                  <div className="remedy-box">
                    <strong>こんな工夫が紹介されています</strong>
                    <ul>
                      {concern.remedies.map((remedy) => (
                        <li key={remedy}>{remedy}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="talk-track">
          <p className="report-kicker">TALK EXAMPLE</p>
          <h3>お客様への説明例</h3>
          <blockquote>「{report.talkTrack}」</blockquote>
        </section>

        <aside className="disclaimer">
          <strong>ご利用にあたって</strong>
          <p>{REPORT_DISCLAIMER}</p>
        </aside>
      </article>
    </section>
  );
});
