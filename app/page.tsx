import Image from "next/image";
import Link from "next/link";

const steps = [
  { number: "01", title: "間取り図をアップロード", note: "PNG・JPEG・WebPに対応", icon: "⌁" },
  { number: "02", title: "AIが方位と配置を整理", note: "北・玄関・水回り・居室", icon: "✦" },
  { number: "03", title: "説明レポートが完成", note: "印刷・PDF保存にも対応", icon: "✓" },
];

const directionItems = [
  ["北", "玄関・洋室"], ["東", "洋室・収納"],
  ["南", "LDK・バルコニー"], ["西", "浴室・洗面室"],
];

function CompassMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="20" />
      <path d="m29.8 18.2-3.5 8.1-8.1 3.5 3.5-8.1 8.1-3.5Z" />
      <path d="M24 2v5M24 41v5M2 24h5M41 24h5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <main className="lp-page">
      <div className="lp-freebar">
        <span>LIMITED FREE ACCESS</span><strong>期間限定・無料公開中</strong><span>登録不要</span>
      </div>

      <header className="lp-header">
        <Link className="lp-brand" href="/" aria-label="住まいの方位レポート ホーム">
          <span className="lp-brand-mark"><CompassMark /></span>
          <span><strong>住まいの方位レポート</strong><small>FOR REAL ESTATE PROFESSIONALS</small></span>
        </Link>
        <nav aria-label="メインナビゲーション">
          <a href="#how-it-works">使い方</a><a href="#report">レポート例</a>
          <a href="/downloads/sample-floorplan.png">サンプル図面</a>
          <Link className="lp-nav-cta" href="/product">無料で試す <span>→</span></Link>
        </nav>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <p className="lp-kicker"><span /> 間取りから、会話のきっかけを。</p>
          <h1>風水の質問に、<em>その場でやさしく</em>答えられる。</h1>
          <p className="lp-lead">間取り図を入れるだけ。AIが方位と部屋配置を読み取り、商談で見せられる説明レポートに整えます。</p>
          <div className="lp-actions">
            <Link className="lp-primary-cta" href="/product"><span>無料でレポートを作る</span><b>→</b></Link>
            <a className="lp-download-link" href="/downloads/sample-floorplan.png">
              <DownloadIcon /><span>サンプル間取り図をダウンロード<small>PNG・1.1MB</small></span>
            </a>
          </div>
          <div className="lp-trust-row" aria-label="サービスの特徴">
            <span><b>0円</b> 期間限定</span><span><b>約1分</b> で作成</span><span><b>保存なし</b> 画像データ</span>
          </div>
        </div>

        <div className="lp-hero-visual" aria-label="間取り図からレポートを生成するイメージ">
          <div className="lp-orbit lp-orbit-one" /><div className="lp-orbit lp-orbit-two" />
          <span className="lp-compass-label">N</span>
          <div className="lp-floorplan-card">
            <div className="lp-image-label"><span /> SAMPLE FLOOR PLAN</div>
            <Image src="/sample-floorplan.png" alt="北マーク入りのサンプル間取り図" width={1024} height={1536} priority loading="eager" sizes="(max-width: 800px) 78vw, 440px" />
          </div>
          <div className="lp-scan-line" />
          <div className="lp-floating-card lp-floating-north"><span>方位を検出</span><strong>北 ↑</strong><i>確認済み</i></div>
          <div className="lp-floating-card lp-floating-room"><span>読み取り結果</span><strong>2LDK</strong><small>玄関・水回り・居室</small></div>
        </div>
      </section>

      <section className="lp-logo-strip" aria-label="利用シーン">
        <span>内見同行</span><i /><span>商談</span><i /><span>物件提案</span><i /><span>PDF資料</span><i />
        <strong>不動産営業の説明を、もっとスムーズに。</strong>
      </section>

      <section className="lp-how" id="how-it-works">
        <div className="lp-section-heading">
          <p className="lp-kicker"><span /> HOW IT WORKS</p><h2>3ステップで、<br />見せられる資料に。</h2>
        </div>
        <div className="lp-step-grid">
          {steps.map((step, index) => (
            <article key={step.number}>
              <span className="lp-step-number">{step.number}</span><div className="lp-step-icon">{step.icon}</div>
              <h3>{step.title}</h3><p>{step.note}</p>
              {index < steps.length - 1 && <b className="lp-step-arrow" aria-hidden="true">→</b>}
            </article>
          ))}
        </div>
      </section>

      <section className="lp-report-showcase" id="report">
        <div className="lp-report-visual">
          <div className="lp-report-paper">
            <header><span>住まいの方位レポート</span><strong>間取りから見た、暮らしのヒント</strong><small>一般的な風水・八宅派の考え方による参考情報</small></header>
            <div className="lp-mini-overview">
              <Image src="/sample-floorplan.png" alt="レポート内のサンプル間取り図" width={1024} height={1536} sizes="150px" />
              <div><b>間取りの読み取り結果</b><p>北側の玄関から中央の廊下へ。南側に明るいLDKとバルコニーを確認。</p><span>読み取り確度　<strong>高</strong></span></div>
            </div>
            <div className="lp-mini-directions">
              {directionItems.map(([direction, rooms]) => <div key={direction}><b>{direction}</b><span>{rooms}</span></div>)}
            </div>
            <div className="lp-mini-points">
              <div><b>✓</b><span><strong>明るいLDK</strong><small>穏やかな説明文</small></span></div>
              <div><b>✓</b><span><strong>整った動線</strong><small>すぐできる工夫も提案</small></span></div>
            </div>
          </div>
          <span className="lp-pdf-tag">PDF</span>
        </div>

        <div className="lp-report-copy">
          <p className="lp-kicker"><span /> READY TO PRESENT</p><h2>「良い・悪い」だけで<br />終わらないレポート。</h2>
          <div className="lp-feature-list">
            <article><span>01</span><div><h3>方位をひと目で整理</h3><p>8方位ごとの部屋・設備を一覧化。</p></div></article>
            <article><span>02</span><div><h3>気になる点には改善策</h3><p>照明・色・家具配置など、取り入れやすい工夫を提案。</p></div></article>
            <article><span>03</span><div><h3>商談用トークまで</h3><p>そのまま口にできる、柔らかな説明例を掲載。</p></div></article>
          </div>
          <Link className="lp-text-cta" href="/product">実際のプロダクトを見る <span>↗</span></Link>
        </div>
      </section>

      <section className="lp-values">
        <div><span>断定しない</span><b>01</b></div><div><span>不安を煽らない</span><b>02</b></div><div><span>会話につなげる</span><b>03</b></div>
      </section>

      <section className="lp-final-cta">
        <div className="lp-final-compass"><CompassMark /></div><p>LIMITED FREE ACCESS</p>
        <h2>次の内見から、<br />風水の質問に迷わない。</h2>
        <span>期間限定ですべての機能を無料公開しています。</span>
        <Link href="/product">無料でレポートを作る <b>→</b></Link>
        <a href="/downloads/sample-floorplan.png"><DownloadIcon /> サンプル間取り図をダウンロード</a>
      </section>

      <footer className="lp-footer">
        <div className="lp-brand lp-footer-brand"><span className="lp-brand-mark"><CompassMark /></span><span><strong>住まいの方位レポート</strong><small>FOR REAL ESTATE PROFESSIONALS</small></span></div>
        <p>本サービスは一般的な風水の考え方をもとにした物件説明の参考情報です。効果、運勢、健康、金運、物件価値を保証するものではありません。</p>
        <span>© 2026 住まいの方位レポート</span>
      </footer>
    </main>
  );
}
