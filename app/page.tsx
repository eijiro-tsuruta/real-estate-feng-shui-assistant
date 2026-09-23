import Image from "next/image";
import Link from "next/link";

const LINE_URL = "https://lin.ee/R09mk3z";

const features = [
  {
    number: "01",
    label: "BUILDING",
    title: "建物間取り風水",
    description:
      "間取り図から建物の中心・方位・玄関・水回り・各室の配置を読み取り、説明しやすい言葉で整理します。",
    tags: ["方位", "水回り", "部屋配置"],
    icon: "floorplan",
  },
  {
    number: "02",
    label: "ROOM",
    title: "お部屋の風水",
    description:
      "一室の東西南北を写真で確認。家具や照明、植物、色、動線など、今の暮らしに取り入れやすい工夫を提案します。",
    tags: ["4方向写真", "家具", "暮らしの工夫"],
    icon: "compass",
  },
  {
    number: "03",
    label: "WALL VISUAL",
    title: "壁のイメージ",
    description:
      "室内壁・外壁・玄関ドアの写真から、言葉や参考画像をもとに完成イメージを生成。提案の認識合わせを助けます。",
    tags: ["室内壁", "外壁", "玄関ドア"],
    icon: "wall",
  },
];

const flow = [
  ["01", "メニューを選ぶ", "目的に合わせて3つの機能から選択。LINEの案内に沿って進めます。"],
  ["02", "写真を送る", "間取り図やお部屋の写真を送信。必要な向きや内容はLINEが順番に案内します。"],
  ["03", "提案に使う", "届いた診断や完成イメージを見ながら、お客様との会話を具体化できます。"],
];

function BrandIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 21.5 24 8l16 13.5V40H8Z" />
      <path d="M18 40V27h12v13M24 8v9" />
      <circle cx="24" cy="20" r="2.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.5 10.2c0-4-3.8-7.2-8.5-7.2S3.5 6.2 3.5 10.2c0 3.6 3.2 6.6 7.5 7.1.3.1.7.2.8.5.1.3.1.7 0 1l-.1.8c0 .2-.2.9.7.5.9-.4 4.7-2.8 6.4-4.8 1.2-1.4 1.7-2.8 1.7-5.1Z" />
    </svg>
  );
}

function FeatureIcon({ type }: { type: string }) {
  if (type === "floorplan") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M8 39V14l16-7 16 7v25Z" /><path d="M24 7v32M8 22h32M16 18v8m16-8v8M18 39V29h12v10" />
      </svg>
    );
  }
  if (type === "compass") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="17" /><path d="m29 19-3 7-7 3 3-7 7-3Z" /><path d="M24 3v5m0 32v5M3 24h5m32 0h5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="8" y="9" width="32" height="30" rx="1" /><path d="M8 31h32M17 31V19h14v12M23 19v12m11-12 5-5" />
    </svg>
  );
}

function LineButton({ className = "" }: { className?: string }) {
  return (
    <a className={`rain-line-button ${className}`} href={LINE_URL} target="_blank" rel="noreferrer">
      <LineIcon /><span>LINEで友だち追加</span><ArrowIcon />
    </a>
  );
}

export default function LandingPage() {
  return (
    <main className="rain-lp">
      <header className="rain-header">
        <Link className="rain-brand" href="/" aria-label="Rain AI おうち風水 ホーム">
          <span className="rain-brand-mark"><BrandIcon /></span>
          <span><strong>Rain AI <i /> おうち風水</strong><small>FENG SHUI × VISUAL AI</small></span>
        </Link>
        <nav aria-label="メインナビゲーション">
          <a href="#features">できること</a><a href="#flow">使い方</a><a href="#professionals">プロの方へ</a>
          <a className="rain-nav-cta" href={LINE_URL} target="_blank" rel="noreferrer">LINEで始める <ArrowIcon /></a>
        </nav>
      </header>

      <section className="rain-hero">
        <div className="rain-hero-copy">
          <p className="rain-eyebrow"><span>LINEで完結</span> 住まいの提案アシスタント</p>
          <h1>住まいの提案を、<br /><em>写真から</em>もっと具体的に。</h1>
          <p className="rain-hero-lead">間取りの風水診断から、お部屋の配置アドバイス、壁の完成イメージまで。お客様が使い慣れたLINEで、迷わず写真を送れます。</p>
          <div className="rain-hero-actions"><LineButton /><span>不動産・注文住宅・リフォームの<br />お客様提案をサポート</span></div>
          <div className="rain-proof" aria-label="サービスの特徴">
            <div><b>01</b><span>LINEで案内</span></div><div><b>02</b><span>AIが画像を分析</span></div><div><b>03</b><span>提案に活用</span></div>
          </div>
        </div>

        <div className="rain-hero-stage" aria-label="実際のLINE建物間取り風水診断画面">
          <span className="rain-stage-word" aria-hidden="true">SPACE</span>
          <div className="rain-phone">
            <Image src="/images/line-app-screen.png" alt="Rain AI おうち風水の実際のLINE診断画面" width={1170} height={2532} priority sizes="(max-width: 640px) 250px, 290px" />
          </div>
          <div className="rain-stage-note rain-note-one"><b>送るだけ</b><small>間取り図やお部屋の写真</small></div>
          <div className="rain-stage-note rain-note-two"><b>結果もLINEで</b><small>商談や打ち合わせに活用</small></div>
          <div className="rain-ai-seal">AI<span>SUPPORT</span></div>
        </div>
      </section>

      <section className="rain-audience" aria-label="対象業種">
        <p>FOR PROFESSIONALS</p><div><span>不動産仲介</span><i /><span>注文住宅</span><i /><span>リフォーム</span><i /><span>風水鑑定</span></div><strong>お客様との会話に、見える答えを。</strong>
      </section>

      <section className="rain-features" id="features">
        <div className="rain-section-heading"><div><p>THREE SOLUTIONS</p><h2>ひとつのLINEで、<br />3つの住まい提案。</h2></div><p>専門的な内容も、やり取りはシンプルに。<br />目的ごとに必要な写真だけを受け付けます。</p></div>
        <div className="rain-feature-grid">
          {features.map((feature, index) => (
            <article className={`rain-feature rain-feature-${index + 1}`} key={feature.number}>
              <div className="rain-feature-top"><span>{feature.number}</span><small>{feature.label}</small></div>
              <div className="rain-feature-icon"><FeatureIcon type={feature.icon} /></div>
              <h3>{feature.title}</h3><p>{feature.description}</p>
              <div className="rain-tags">{feature.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="rain-diagnosis">
        <div className="rain-floorplan-wrap">
          <span className="rain-image-caption">BUILDING FENG SHUI / SAMPLE</span>
          <div className="rain-floorplan-image"><Image src="/sample-floorplan.png" alt="建物間取り風水で使用するサンプル間取り図" width={1024} height={1536} sizes="(max-width: 800px) 76vw, 430px" /><span className="rain-north">N</span><i /></div>
          <div className="rain-result-chip"><span>AI ANALYSIS</span><strong>方位と配置を整理しました</strong><small>玄関 / LDK / 水回り / 各室</small></div>
        </div>
        <div className="rain-diagnosis-copy">
          <p className="rain-section-label">DESIGNED FOR DIALOGUE</p><h2>診断で終わらず、<br />次の提案につなげる。</h2>
          <p className="rain-diagnosis-lead">結果は「良い・悪い」と断定するものではありません。気になる点には、家具配置や照明、色使いなどの工夫を添え、お客様が前向きに検討できる会話を支えます。</p>
          <dl>
            <div><dt>01</dt><dd><strong>必要な情報だけを収集</strong><span>選んだメニューに合わせて、LINEが送る写真や順番を案内。</span></dd></div>
            <div><dt>02</dt><dd><strong>写真の差し替えにも対応</strong><span>撮り直したい方向を選び、その1枚だけを送り直せます。</span></dd></div>
            <div><dt>03</dt><dd><strong>柔らかな表現で提案</strong><span>不安を煽らず、暮らしに取り入れやすい改善策まで伝えます。</span></dd></div>
          </dl>
        </div>
      </section>

      <section className="rain-flow" id="flow">
        <div className="rain-section-heading rain-heading-light"><div><p>HOW IT WORKS</p><h2>お客様は、LINEを<br />開くだけ。</h2></div><p>専用アプリのインストールや、複雑なフォーム入力は不要です。</p></div>
        <div className="rain-flow-grid">
          {flow.map(([number, title, description], index) => (
            <article key={number}><span>{number}</span><div className={`rain-flow-visual rain-flow-${index + 1}`} aria-hidden="true">
              {index === 0 && <><b>建物</b><b>部屋</b><b>壁</b></>}{index === 1 && <><b>N</b><b>E</b><b>S</b><b>W</b></>}{index === 2 && <><b>AI</b><b>提案</b><i>✓</i></>}
            </div><h3>{title}</h3><p>{description}</p></article>
          ))}
        </div>
      </section>

      <section className="rain-professionals" id="professionals">
        <div><p className="rain-section-label">FOR YOUR BUSINESS</p><h2>感覚的な相談を、<br />提案できる形に。</h2><p>「この間取り、風水ではどうですか？」「この壁の色、変えたらどう見えますか？」。答えにくかった相談を、その場の会話から次の提案へつなげます。</p></div>
        <div className="rain-pro-list">
          <article><span>01</span><div><strong>商談の付加価値に</strong><p>物件・プラン提案に、暮らしの視点を加えられます。</p></div></article>
          <article><span>02</span><div><strong>認識合わせをスムーズに</strong><p>言葉だけで伝えにくい壁の印象も、画像で共有できます。</p></div></article>
          <article><span>03</span><div><strong>お客様の負担を軽く</strong><p>普段使うLINEで、案内に沿って写真を送るだけです。</p></div></article>
        </div>
      </section>

      <section className="rain-final">
        <div className="rain-final-copy"><p>START WITH LINE</p><h2>住まいの相談を、<br />もっとわかりやすく。</h2><span>友だち追加後、トーク画面のメニューから始められます。</span><LineButton className="rain-final-button" /></div>
        <a className="rain-qr-card" href={LINE_URL} target="_blank" rel="noreferrer" aria-label="LINEで友だち追加">
          <Image src="/images/line-add-friend-qr.png" alt="Rain AI おうち風水 LINE友だち追加QRコード" width={360} height={360} />
          <span><b>SCAN TO START</b>スマートフォンで<br />読み取ってください</span>
        </a>
      </section>

      <footer className="rain-footer">
        <div className="rain-brand"><span className="rain-brand-mark"><BrandIcon /></span><span><strong>Rain AI <i /> おうち風水</strong><small>FENG SHUI × VISUAL AI</small></span></div>
        <p>本サービスの風水に関する内容は、一般的な考え方に基づく提案の参考情報です。効果、運勢、健康、金運、物件価値を保証するものではありません。</p><span>© 2026 Rain AI</span>
      </footer>
    </main>
  );
}
