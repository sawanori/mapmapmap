# Document Review Report: Context-Map

| 項目 | 内容 |
|------|------|
| レビューモード | Comprehensive (総合レビュー) |
| レビュー日 | 2026-02-10 |
| レビュー対象 | PRD, Design Doc, ADR-0001, ADR-0002, ADR-0003 |
| 参照ドキュメント | idea.md (原典) |
| 判定 | **Needs Revision（要修正）** |

---

## 1. 判定サマリ

### スコア

| 評価軸 | スコア | 閾値 (Approved) | 判定 |
|--------|--------|-----------------|------|
| 整合性 (Consistency) | 72/100 | >90 | FAIL |
| 完全性 (Completeness) | 78/100 | >85 | FAIL |
| 規約準拠 (Rule Compliance) | 82/100 | - | PASS |
| 明瞭性 (Clarity) | 85/100 | - | PASS |

### 判定理由

整合性スコアが80未満であり、`idea.md`（原典）と PRD / Design Doc / ADR 間に **3件の Critical な不整合** が存在する。これらはベクトル検索のクエリパターン、Embeddingカラムの型定義、フィルタリング半径という **システムの中核仕様** に関わるため、実装開始前の解消が必要である。

---

## 2. Critical Issues

### I001: ベクトル検索SQLクエリパターンの不整合
- **idea.md**: `ORDER BY vector_distance_cos(embedding, ...) ASC LIMIT 50` (全件スキャン)
- **Design Doc/ADR-0002**: `vector_top_k('spots_idx', vector32(:query_vector), 50)` (DiskANNインデックス)
- **対応**: Design Doc の `vector_top_k` 方式を正とする

### I002: 距離フィルタリング半径の不整合
- **idea.md テキスト**: 2km / **idea.md コード**: 3km / **PRD/Design Doc**: 3km
- **対応**: 3km に統一

### I003: Embedding カラム型定義の不整合
- **idea.md**: `text("embedding")` / **Design Doc/ADR-0003**: `F32_BLOB(1536)`
- **対応**: F32_BLOB(1536) を正とする

## 3. Important Issues (7件)
- I004: ファイルパス不整合 (src/actions/search.ts vs src/app/actions.ts)
- I005: Mapbox APIキーのセキュリティ記述矛盾
- I006: Next.js バージョン陳腐化 (15 vs 16.1)
- I007: requirements-analysis.md の不在
- I008: idea.md 内部矛盾 (ER図 blob vs Drizzle text)
- I009: seed.ts 実装仕様不足
- I010: 環境変数名の不整合

## 4. Recommended (5件)
- I011-I016: アナリティクス、リトライ方針、react-map-gl v8、Drizzle customType、障害シナリオ
