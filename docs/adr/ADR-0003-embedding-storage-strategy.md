# ADR-0003: Embedding格納戦略 (float32Array + DiskANNインデックス)

| 項目 | 内容 |
|------|------|
| ステータス | Accepted |
| 日付 | 2026-02-10 |
| 決定者 | Context-Map チーム |
| 関連ADR | ADR-0001, ADR-0002 |

---

## 背景

Context-Map ではOpenAI text-embedding-3-small（1536次元）で生成されたEmbeddingベクトルをTurso (libSQL) に格納し、セマンティック検索に使用する。Tursoはネイティブベクトル型として複数のカラム型をサポートしており、格納形式の選択がクエリ性能、ストレージ効率、インデックス互換性に直接影響する。

### 制約条件
- Embeddingモデル: OpenAI text-embedding-3-small（1536次元、float32）
- DB: Turso (libSQL) のネイティブベクトル拡張
- MVPデータ件数: 100-500件
- DiskANNインデックスによる近似最近傍検索を使用

---

## オプション

### オプションA: F32_BLOB (float32Array) + DiskANNインデックス [選択案]

- **概要**: Tursoのネイティブベクトル型 `F32_BLOB(1536)` を使用し、32ビット浮動小数点でEmbeddingを格納。DiskANNインデックスでCosine類似度による近似最近傍検索を高速化する
- **メリット**:
  - OpenAI APIが返すfloat32をそのまま格納でき、精度損失がゼロ
  - DiskANNインデックスと完全互換（`vector_top_k`関数が使用可能）
  - Tursoの公式推奨格納形式
  - `vector32()` 関数による挿入と `vector_distance_cos()` による距離計算が利用可能
- **デメリット**:
  - 1レコードあたり約6KB (1536 x 4bytes)のストレージ消費
  - 500件で約3MB、将来10,000件で約60MBのベクトルデータ
- **工数**: 1日

### オプションB: TEXT (JSON文字列) + アプリケーション層での距離計算

- **概要**: Embeddingを `JSON.stringify()` でTEXTカラムに格納し、全件取得後にアプリケーション層でCosine Similarity計算を行う
- **メリット**:
  - 実装が最もシンプル（特別なDB機能不要）
  - デバッグ時にEmbeddingの中身を直接確認できる
  - Drizzle ORMの標準text型で定義可能
- **デメリット**:
  - DiskANNインデックスが使用不可（全件スキャン必須）
  - データ増加に伴い線形に性能劣化
  - JSON文字列のパース・数値配列変換のオーバーヘッド
  - 1レコードあたり約20KB（JSON文字列は数値のテキスト表現で膨張）
- **工数**: 0.5日（ただし将来の移行コストあり）

### オプションC: F32_BLOB (float32Array) インデックスなし

- **概要**: ネイティブベクトル型を使用するがDiskANNインデックスは作成せず、`vector_distance_cos()` による全件スキャンで検索する
- **メリット**:
  - ネイティブ型の精度メリットを享受
  - インデックス作成・更新のオーバーヘッドなし
  - 500件以下では全件スキャンでも十分高速
- **デメリット**:
  - データ増加時にインデックス追加の移行が必要
  - `vector_top_k()` 関数が使用不可
  - 将来のスケーリング時にスキーマ変更が発生
- **工数**: 0.5日

---

## 比較

| 評価軸 | オプションA (F32_BLOB+DiskANN) | オプションB (TEXT/JSON) | オプションC (F32_BLOB, No Index) |
|--------|------------------------------|------------------------|----------------------------------|
| 検索精度 | 高 (float32精度保持) | 高 (float32相当) | 高 (float32精度保持) |
| 検索速度 (500件) | 最高速 (~数ms) | 低速 (~数百ms) | 高速 (~数十ms) |
| 検索速度 (10,000件) | 高速 (ANN) | 非常に低速 | 低速 (線形スキャン) |
| ストレージ効率 | 良好 (6KB/record) | 低い (20KB/record) | 良好 (6KB/record) |
| DiskANNインデックス互換 | 完全対応 | 非対応 | 非対応 (後から追加可) |
| 実装単純性 | 中 (ネイティブ型の理解が必要) | 高 | 中 |
| 将来のスケーラビリティ | 高 | 低 (移行必須) | 中 (インデックス追加必要) |
| Turso公式推奨 | 推奨 | 非推奨 | 部分的 |

---

## 決定

**オプションA (F32_BLOB + DiskANNインデックス)** を選択する。

### 理由

1. **「正しく始める」原則**: MVPでも最初からTurso推奨のネイティブベクトル型とインデックスを使用することで、将来の移行コストを回避する。オプションBやCは短期的な実装工数を節約できるが、データ増加時に必ず移行が必要となり、トータルコストが高くなる。

2. **公式APIとの整合性**: `F32_BLOB` + DiskANNの組み合わせにより、Tursoが提供する `vector_top_k()` テーブル値関数を使用でき、ADR-0002で決定したベクトル検索アーキテクチャと自然に統合される。

3. **精度の保証**: OpenAI text-embedding-3-smallが出力するfloat32ベクトルをそのまま格納するため、量子化や変換による情報損失がない。セマンティック検索の品質がデータ格納形式に依存しない。

### トレードオフ

- F32_BLOBのストレージ消費（6KB/record）はMVP規模では問題にならないが、将来的に圧縮オプション（`compress_neighbors=float8`等）の検討が必要になる可能性がある。
- Drizzle ORMのスキーマ定義でネイティブベクトル型を直接表現できないため、Raw SQLまたはカスタムカラム型を使用する必要がある。

---

## 実装詳細

### スキーマ定義 (SQL)

```sql
CREATE TABLE spots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  magazine_context TEXT,
  embedding F32_BLOB(1536),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- DiskANNインデックス (Cosine類似度)
CREATE INDEX spots_idx ON spots (
  libsql_vector_idx(embedding, 'metric=cosine')
);
```

### ベクトル挿入 (Seed時)

```sql
INSERT INTO spots (name, lat, lng, category, description, magazine_context, embedding)
VALUES (
  '喫茶 琥珀',
  35.6762,
  139.7649,
  'Cafe',
  '創業50年。琥珀色の照明の中で時間が止まる体験を。',
  'BRUTUS 2024/02 読書特集',
  vector32('[0.023, -0.041, 0.067, ...]')  -- 1536次元
);
```

### ベクトル検索クエリ

```sql
SELECT s.id, s.name, s.lat, s.lng, s.category, s.description, s.magazine_context
FROM vector_top_k('spots_idx', vector32(:query_vector), 50) AS v
JOIN spots AS s ON s.rowid = v.id;
```

### ストレージ試算

| データ件数 | ベクトルデータ | インデックスサイズ (推定) | 合計 (推定) |
|-----------|---------------|-------------------------|-------------|
| 100件 | ~600KB | ~200KB | ~800KB |
| 500件 | ~3MB | ~1MB | ~4MB |
| 10,000件 | ~60MB | ~20MB | ~80MB |

---

## 結果と影響

### 正の結果
- DiskANNインデックスによるサブミリ秒レベルのベクトル検索
- float32精度によるセマンティック検索品質の保証
- Turso公式APIとの完全な整合性
- 将来のデータ増加に対する拡張パスが明確

### 負の結果
- Drizzle ORMのスキーマ定義でRaw SQLが必要な箇所が生じる
- ベクトル挿入時に `vector32()` 関数の使用が必要

### 実装ガイドライン（原則）
- Embedding格納にはTursoの `F32_BLOB(1536)` ネイティブ型のみを使用する
- ベクトル挿入は `vector32()` 関数を経由する
- ベクトル検索は `vector_top_k()` テーブル値関数を使用する
- Drizzle ORMで表現できない操作はRaw SQLをラップした型安全なヘルパー関数を作成する
- スキーママイグレーションはDrizzle KitのカスタムSQLで管理する

---

## 参考資料

- [Turso AI & Embeddings - Vector Columns](https://docs.turso.tech/features/ai-and-embeddings) - F32_BLOBカラム型の公式ドキュメント
- [Turso Native Vector Search](https://turso.tech/blog/turso-brings-native-vector-search-to-sqlite) - ネイティブベクトル検索の概要
- [DiskANN in libSQL](https://turso.tech/blog/approximate-nearest-neighbor-search-with-diskann-in-libsql) - DiskANNインデックスの技術解説
- [Space Complexity of Vector Indexes](https://turso.tech/blog/the-space-complexity-of-vector-indexes-in-libsql) - ベクトルインデックスのストレージ分析
- [OpenAI text-embedding-3-small](https://platform.openai.com/docs/models/text-embedding-3-small) - Embeddingモデル仕様
- [How to Generate & Store OpenAI Vector Embeddings with Turso](https://turso.tech/blog/how-to-generate-and-store-openai-vector-embeddings-with-turso) - OpenAI + Turso統合ガイド
