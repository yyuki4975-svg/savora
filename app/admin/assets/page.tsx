import Link from "next/link";
import { AssetLibrary } from "../../upgrade-experiences";
import { Footer, Header } from "../../ui";

export const metadata = { title: "Asset management dashboard" };

export default function AssetDashboardPage() {
  return <main>
    <Header />
    <section className="section-shell asset-review-entry">
      <div>
        <span>Editorial review · Three active queues</span>
        <strong>Review selected NHLBI candidates, inherited recipe images, or the 21 generated replacements.</strong>
        <p>Visual decisions stay local, remain separate from rights clearance, and can be exported without publishing anything.</p>
      </div>
      <div className="asset-review-actions">
        <Link className="button-link" href="/admin/assets/themealdb/replacements">Review 21 replacements</Link>
        <Link className="button-link" href="/admin/assets/themealdb">Review 790 images</Link>
        <Link className="button-link secondary" href="/admin/assets/review">Review NHLBI batch</Link>
      </div>
    </section>
    <AssetLibrary />
    <Footer />
  </main>;
}

