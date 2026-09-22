import type { Metadata } from "next";
import ProductApp from "./ProductApp";

export const metadata: Metadata = {
  title: "無料でレポートを作る | 住まいの方位レポート",
  description: "間取り図をアップロードして、商談で使える風水説明レポートを無料で作成できます。",
};

export default function ProductPage() {
  return <ProductApp />;
}
