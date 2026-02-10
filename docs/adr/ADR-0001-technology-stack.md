# ADR-0001: 技術スタック選定 (Next.js 15 + Turso + Mapbox + OpenAI)

| 項目 | 内容 |
|------|------|
| ステータス | Accepted |
| 日付 | 2026-02-10 |
| 決定者 | Context-Map チーム |
| 関連ADR | ADR-0002, ADR-0003 |

---

## 背景

Context-Map は「文脈（Vibe）で場所を探せる地図Webアプリケーション」であり、セマンティック検索、地図描画、ベクトルデータベース、Embedding生成という4つの技術領域を統合する必要がある。MVP段階では開発速度、運用コスト、パフォーマンスのバランスを取りつつ、モバイルファーストの体験を提供する技術スタックを選定する必要がある。

### 技術的制約
- MVP対象地域は東京のみ（データ件数: 100-500件）
- ユーザー認証は不要（匿名利用）
- 検索レスポンス2秒以内（P95）
- モバイルファーストかつデスクトップ対応
- APIキーはサーバーサイドのみで使用

---

## オプション

### オプションA: Next.js 15 + Turso + Mapbox GL JS + OpenAI (選択案)

- **概要**: フルスタックNext.jsをフレームワークとし、SQLiteベースのTursoをベクトル対応DBに、Mapbox GL JSで地図描画、OpenAIでEmbedding生成するフルマネージド構成
- **メリット**:
  - Server Actionsにより APIルート不要でフロント/バック統合開発が可能
  - TursoのネイティブベクトルサポートでDB一本化（別途ベクトルDB不要）
  - Mapboxの高いカスタマイズ性（モノクロームスタイルの実現）
  - Vercel + Edge Runtimeとの親和性が高い
- **デメリット**:
  - Tursoのベクトル検索は比較的新しい機能であり、大規模データでの実績が限定的
  - Mapboxは月間50,000マップロード超過で従量課金
  - OpenAI APIへの依存（検索ごとのAPI呼び出しコスト）
- **工数**: 2-3週間

### オプションB: Remix + Supabase (pgvector) + Leaflet + OpenAI

- **概要**: Remixフレームワーク + PostgreSQLベースのSupabase (pgvector拡張) + オープンソースのLeaflet地図ライブラリ
- **メリット**:
  - pgvectorはベクトル検索の成熟した実装
  - PostGISとの統合で地理空間クエリをDB層で実行可能
  - Leafletはオープンソースで課金なし
- **デメリット**:
  - Supabaseの無料枠を超えるとコスト増（PostgreSQLリソース）
  - Leafletのスタイルカスタマイズ性が低い（モノクロームスタイルの実現が困難）
  - Remixのエコシステムや開発者プールがNext.jsと比較して小さい
  - PostGIS + pgvectorの設定と運用が複雑
- **工数**: 3-4週間

### オプションC: Next.js 15 + Pinecone + Google Maps + Cohere

- **概要**: 専用ベクトルDB (Pinecone) + Google Maps Platform + Cohere Embeddingの組み合わせ
- **メリット**:
  - Pineconeは大規模ベクトル検索に特化した高性能DB
  - Google Mapsは圧倒的な地図データの正確性
  - Cohereのembedモデルは多言語対応に優れる
- **デメリット**:
  - Pineconeの追加コスト（別サービスの運用・課金）
  - Google Mapsのスタイルカスタマイズ制限（モノクロームの自由度が低い）
  - 外部サービスが3つに増え、運用複雑性が上昇
  - Cohereはtext-embedding-3-smallに比べてコストパフォーマンスで劣る
- **工数**: 3-4週間

---

## 比較

| 評価軸 | オプションA (Next.js+Turso+Mapbox+OpenAI) | オプションB (Remix+Supabase+Leaflet) | オプションC (Next.js+Pinecone+GMaps+Cohere) |
|--------|------------------------------------------|--------------------------------------|---------------------------------------------|
| 実装工数 | 2-3週間 | 3-4週間 | 3-4週間 |
| 運用コスト (MVP) | 低 (Turso無料枠+Mapbox無料枠) | 中 (Supabase無料枠超過リスク) | 高 (Pinecone+GMaps従量課金) |
| 地図カスタマイズ性 | 高 (Mapbox Studio) | 低 (Leaflet制限) | 中 (GMaps制限あり) |
| ベクトル検索性能 | 十分 (MVP規模500件) | 高 (pgvector成熟) | 非常に高 (Pinecone特化) |
| 開発体験 | 優秀 (Server Actions統合) | 良好 | 良好 |
| アーキテクチャ単純性 | 高 (DB一本化) | 中 (PostGIS設定) | 低 (3サービス依存) |
| モバイル対応 | 優秀 (App Router SSR) | 良好 | 優秀 |
| スケーラビリティ | 中 (Turso制約あり) | 高 | 非常に高 |

---

## 決定

**オプションA (Next.js 15 + Turso + Mapbox GL JS + OpenAI)** を選択する。

### 理由

1. **MVP規模に最適化**: データ件数100-500件の規模では、Tursoのネイティブベクトル検索で十分な性能が得られ、専用ベクトルDBの導入は過剰投資となる。YAGNI原則に従い、現在の要件に最適な構成を選択する。

2. **アーキテクチャの単純性**: DB一本化によりデータ同期の問題が発生せず、運用負荷が最小限。Server Actionsによるフロント/バック統合で、APIレイヤーのボイラープレートを排除できる。

3. **UIビジョンの実現性**: Mapbox GL JSのスタイルカスタマイズ性は、コンセプトの核である「白黒モノクローム + ピンのみのアクセント」というデザインビジョンの実現に不可欠。他の地図ライブラリではこの水準の表現が困難である。

### トレードオフ

- Tursoのベクトル検索は比較的新しいが、MVP規模(500件以下)では性能リスクは低い。データ件数が10,000件を超える段階で再評価が必要。
- Mapboxの無料枠(月間50,000ロード)はMVPでは十分だが、トラフィック増加時にコスト計画が必要。

---

## 結果と影響

### 正の結果
- 単一DBによる運用単純化
- Server Actionsによる高速な開発サイクル
- Mapboxによる高品質な地図UI
- 低い初期運用コスト

### 負の結果
- Tursoベクトル検索のスケーラビリティ上限に注意が必要
- Mapbox無料枠超過時のコスト計画が将来必要
- OpenAI APIへの依存（可用性・コスト）

### 実装ガイドライン（原則）
- 全てのAPIキーはサーバーサイド環境変数でのみ使用する
- 外部サービス呼び出しにはタイムアウトとリトライロジックを実装する
- DBアクセスはDrizzle ORMを通じて型安全に行う
- コンポーネントは依存注入可能な設計とし、テスタビリティを確保する

---

## 参考資料

- [Turso AI & Embeddings Documentation](https://docs.turso.tech/features/ai-and-embeddings) - Tursoのベクトル検索機能公式ドキュメント
- [Next.js 15 App Router](https://nextjs.org/docs/app) - Next.js App Router公式ドキュメント
- [Drizzle ORM + Turso Integration](https://orm.drizzle.team/docs/tutorials/drizzle-with-turso) - Drizzle ORMとTursoの統合ガイド
- [Mapbox GL JS + React](https://www.mapbox.com/blog/mapbox-gl-js-react) - MapboxとReactの統合ガイド
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings) - OpenAI Embedding公式ドキュメント
- [react-map-gl](https://visgl.github.io/react-map-gl/) - React用Mapboxラッパーライブラリ
