# Search Algorithm Formula: Addresses and Places

This document describes the current implemented scoring and ranking logic for search results in Feldpost.

Scope:

- Address search (`db-address` + `geocoder` families)
- Place/content search (`db-content` family: projects and saved groups)

Implementation sources:

- `apps/web/src/app/core/search/search-bar.service.ts`
- `apps/web/src/app/core/search/search-bar-resolvers.ts`
- `apps/web/src/app/core/search/search-geocoder-scoring.ts`
- `apps/web/src/app/core/search/search-bar-helpers.ts`
- `apps/web/src/app/core/search/search-query.ts`

---

## 1. Shared Text Match Function

For all families, text matching starts with `computeTextMatchScore(label, query)`:

\[
\text{textMatch}(L, Q)=
\begin{cases}
1.00 & \text{if } L = Q \\
0.92 & \text{if } L \text{ startsWith } Q \\
0.80 & \text{if } L \text{ includes } Q \\
\min(0.79,\ 0.20\cdot s) & \text{otherwise}
\end{cases}
\]

Where:

- $L$ is normalized label text (trim/lowercase)
- $Q$ is normalized query text (trim/lowercase)
- $s$ is the number of query tokens that appear in the label

---

## 2. Address Search Formula

Address search has two sources:

- DB addresses (`family = db-address`)
- Geocoder addresses (`family = geocoder`)

### 2.1 DB Address Score

Rows are grouped by formatted label. For each label group:

\[
\text{score}\_{dbAddr} = \text{textMatch} \cdot \text{projectBoost} \cdot \text{dataGravity} \cdot \text{recencyDecay}
\]

With:

\[
\text{projectBoost}=
\begin{cases}
1 + \dfrac{\text{activeProjectHits}}{\max(1,\text{count})} & \text{if active project exists and has hits} \\
1 & \text{otherwise}
\end{cases}
\]

\[
\text{dataGravity}=\log_2(\text{count}+1)
\]

\[
\text{recencyDecay}=\frac{1}{1+\frac{\text{ageDays}}{30}}
\]

Where:

- `count` = number of images in that grouped address
- `activeProjectHits` = rows in group that belong to active project
- `ageDays` = days since newest row in that group

DB address ranking:

1. Higher score
2. Higher image count
3. Label alphabetical
4. Stable id tie-break

### 2.2 Geocoder Address Score

Each geocoder candidate computes:

\[
\text{textScore} = \max(\text{textMatch}(primaryLabel,Q),\ \text{textMatch}(formattedLabel,Q))
\]

\[
\text{geoScore}=0.30\cdot m + 0.25\cdot p + 0.20\cdot u + 0.15\cdot v + 0.10\cdot d
\]

Each component is exponential distance decay:

\[
m=e^{-dist*{marker}/1500},\ p=e^{-dist*{project}/5000},\ u=e^{-dist*{user}/8000},\ v=e^{-dist*{viewportCenter}/6000},\ d=e^{-dist\_{data}/9000}
\]

If a context anchor is missing, that component defaults to $0.5$.

Country factor:

- `countryBoost = 1.6` if candidate country is allowed
- `countryBoost = 0.7` if outside allowed country set
- `countryBoost = 1` when no country constraint

Country score used in weighted formula:

\[
\text{countryScore}=
\begin{cases}
1 & \text{if countryBoost} > 1 \\
0 & \text{if countryBoost} < 1 \\
0.5 & \text{otherwise}
\end{cases}
\]

Quality score:

\[
\text{qualityScore}=\text{clamp}\_{[0,1]}(importance)
\]

Noise penalty is only applied for short ambiguous prefix queries (`len 3..6`, no space, `textScore < 0.95`):

\[
\text{noisePenalty}=\text{locationPenalty}+\text{geoPenalty}+\text{prefixPenalty}
\]

\[
\text{locationPenalty}=
\begin{cases}
0 & \text{if in viewport} \\
0.25 & \text{if not in viewport and countryBoost} < 1 \\
0.15 & \text{if not in viewport and countryBoost} \ge 1
\end{cases}
\]

\[
\text{geoPenalty}=
\begin{cases}
0.30 & \text{if geoScore} < 0.15 \\
0.20 & \text{if } 0.15 \le \text{geoScore} < 0.30 \\
0 & \text{otherwise}
\end{cases}
\]

\[
\text{prefixPenalty}=
\begin{cases}
0 & \text{if primaryLabel first token starts with query} \\
0.45 & \text{otherwise}
\end{cases}
\]

Weighted score:

For short prefix queries (`len 3..6`, no space):

\[
\text{weighted}=0.35\cdot\text{textScore}+0.45\cdot\text{geoScore}+0.10\cdot\text{qualityScore}+0.10\cdot\text{countryScore}-\text{noisePenalty}
\]

Otherwise:

\[
\text{weighted}=0.50\cdot\text{textScore}+0.30\cdot\text{geoScore}+0.15\cdot\text{qualityScore}+0.05\cdot\text{countryScore}-\text{noisePenalty}
\]

Final geocoder score:

\[
\text{score}_{geo}=\text{clamp}_{[0,1]}(\text{weighted})
\]

Geocoder ranking comparator (after filtering):

1. In viewport first
2. First-token prefix match first
3. Smaller distance to search context
4. Higher score
5. Label alphabetical

### 2.3 Address Filtering Gates

Before ranking geocoder candidates:

- Minimum query length for geocoder: `>= 3`
- Keep only street/city-level results
- Apply country/viewport-localization check
- Apply lexical threshold:

\[
\text{minLexical}(len(Q))=
\begin{cases}
0.6 & len \le 4 \\
0.7 & 5 \le len \le 6 \\
0.8 & 7 \le len \le 9 \\
0.9 & len \ge 10
\end{cases}
\]

Short query fallback behavior also exists:

- constrained query first (country/viewport aware)
- optional unconstrained retry for ambiguous short prefixes
- optional city-hint retry when strict search has no hits

---

## 3. Place Search Formula

In the codebase, "places" in search content are DB-backed entities in `db-content`:

- Projects
- Saved groups

### 3.1 Project Candidate Score

\[
\text{score}\_{project}=\text{textMatch}\cdot\text{projectBoost}\cdot\text{sizeSignal}
\]

\[
\text{projectBoost}=
\begin{cases}
2.0 & \text{if candidate project is active project} \\
1.0 & \text{otherwise}
\end{cases}
\]

### 3.2 Saved Group Candidate Score

\[
\text{score}\_{group}=\text{textMatch}\cdot\text{groupBoost}\cdot\text{sizeSignal}
\]

\[
\text{groupBoost}=
\begin{cases}
1.6 & \text{if candidate group is currently selected group} \\
1.0 & \text{otherwise}
\end{cases}
\]

### 3.3 Size Signal

For both projects and groups:

\[
\text{sizeSignal}=1+0.35\cdot\log_2(\max(1,\text{size})+1)
\]

Where:

- project size = number of images in project
- group size = number of images in saved group

Place/content ranking:

1. Higher score
2. Label alphabetical

---

## 4. Practical Reading of the Formula

- Text match remains the primary lexical gate for all families.
- Address geocoder ranking is context-aware (viewport/location/active project) and explicitly penalizes noisy short-prefix matches.
- DB address and place/content scoring both include "data gravity" behavior through count/size multipliers.
- Active context (active project, selected group, viewport, country) has strong influence and intentionally biases toward likely local intent.

---

## 5. Notes

- Constants in this document are copied from current implementation and should be updated if search tuning values change in code.
- This is an implementation formula document, not a product-level UX spec.

---

## 6. Step-by-Step Tuning Worksheet (Filters and Weights)

Use this section when you want to tune behavior. Go from Step 1 to Step 7 and only change one parameter group at a time.

### Step 1: Normalize Query

Input query is normalized (lowercase, accent folding, punctuation cleanup, street-token corrections).

Change points:

- Street token corrections (`str` -> `strasse`, `g` -> `gasse`, etc.)
- Prefix fallback generation behavior

Where to edit:

- `apps/web/src/app/core/search/search-query.ts`

### Step 2: Apply Address Filters (Geocoder)

Geocoder candidate must pass these filters:

1. Query length gate
2. Street/city-level gate
3. Country/viewport localization gate
4. Lexical threshold gate

Main tuning values:

- `minimum geocoder query length = 3`
- `minLexical(len)` thresholds: `0.6 / 0.7 / 0.8 / 0.9`

Where to edit:

- `apps/web/src/app/core/search/search-bar-resolvers.ts`

### Step 3: Score DB Address Candidates

Formula:

\[
ext{score}\_{dbAddr} = \text{textMatch} \cdot \text{projectBoost} \cdot \log_2(\text{count}+1) \cdot \frac{1}{1+\frac{\text{ageDays}}{30}}
\]

Main tuning values:

- Active-project boost shape (`1 + hits/count`)
- Data gravity function (`log2(count+1)`)
- Recency half-life base (`30 days`)

Where to edit:

- `apps/web/src/app/core/search/search-bar.service.ts`
- `apps/web/src/app/core/search/search-bar-helpers.ts`

### Step 4: Score Geocoder Candidates

Base weighted score:

Short prefix query:

\[
0.35\cdot\text{textScore}+0.45\cdot\text{geoScore}+0.10\cdot\text{qualityScore}+0.10\cdot\text{countryScore}-\text{noisePenalty}
\]

Normal query:

\[
0.50\cdot\text{textScore}+0.30\cdot\text{geoScore}+0.15\cdot\text{qualityScore}+0.05\cdot\text{countryScore}-\text{noisePenalty}
\]

Main tuning values:

- Text/geo/quality/country weights
- Country boost (`1.6` / `0.7`)
- Distance decay taus (`1500, 5000, 8000, 6000, 9000`)

Where to edit:

- `apps/web/src/app/core/search/search-geocoder-scoring.ts`
- `apps/web/src/app/core/search/search-bar-helpers.ts`

### Step 5: Apply Noise Penalties (Short Prefix Only)

Penalty parts:

- Location penalty (`0.25` or `0.15`)
- Geo penalty (`0.30` or `0.20`)
- Prefix penalty (`0.45`)

Main tuning values:

- Short-prefix trigger conditions (length and score cutoff)
- Individual penalty magnitudes

Where to edit:

- `apps/web/src/app/core/search/search-geocoder-scoring.ts`

### Step 6: Score Places (Projects and Saved Groups)

Project:

\[
ext{score}\_{project}=\text{textMatch}\cdot\text{projectBoost}\cdot\text{sizeSignal}
\]

Group:

\[
ext{score}\_{group}=\text{textMatch}\cdot\text{groupBoost}\cdot\text{sizeSignal}
\]

\[
ext{sizeSignal}=1+0.35\cdot\log_2(\max(1,\text{size})+1)
\]

Main tuning values:

- Project boost (`2.0`)
- Group boost (`1.6`)
- Size multiplier coefficient (`0.35`)

Where to edit:

- `apps/web/src/app/core/search/search-bar-resolvers.ts`
- `apps/web/src/app/core/search/search-bar-helpers.ts`

### Step 7: Rank Ordering and Retry Strategy

After scoring, final ordering uses comparator logic (viewport, prefix, proximity, score, label) and optional retries (unconstrained retry, city-hint retry).

Main tuning values:

- Comparator priority order
- Retry trigger thresholds (`distance > 60km`, `top score < 0.75`)

Where to edit:

- `apps/web/src/app/core/search/search-bar-resolvers.ts`
- `apps/web/src/app/core/search/search-bar.service.ts`

---

## 7. Editable Parameter Sheet

Copy this block when tuning. Keep the values in sync with code.

```yaml
search_tuning:
	shared:
		text_match:
			exact: 1.0
			starts_with: 0.92
			includes: 0.80
			token_match_weight: 0.20
			token_match_cap: 0.79

	geocoder_filters:
		min_query_length: 3
		lexical_thresholds:
			len_le_4: 0.60
			len_5_to_6: 0.70
			len_7_to_9: 0.80
			len_ge_10: 0.90

	db_address:
		recency_days_base: 30
		data_gravity: log2(count + 1)
		project_boost: 1 + active_project_hits / max(1, count)

	geocoder_scoring:
		short_prefix_query:
			len_min: 3
			len_max: 6
			no_space_required: true
			ambiguous_text_score_lt: 0.95
		weights_short_prefix:
			text: 0.35
			geo: 0.45
			quality: 0.10
			country: 0.10
		weights_normal:
			text: 0.50
			geo: 0.30
			quality: 0.15
			country: 0.05
		country_boost:
			in_country: 1.6
			out_of_country: 0.7
			neutral: 1.0
		geo_decay_taus_meters:
			marker: 1500
			project: 5000
			user: 8000
			viewport: 6000
			data: 9000
		penalties:
			location_out_of_view_out_country: 0.25
			location_out_of_view_in_country: 0.15
			geo_lt_0_15: 0.30
			geo_lt_0_30: 0.20
			prefix_not_matching: 0.45

	place_scoring:
		project_boost_if_active: 2.0
		group_boost_if_selected: 1.6
		size_signal_multiplier: 0.35

	retries:
		unconstrained_if_top_distance_gt_meters: 60000
		unconstrained_if_top_score_lt: 0.75
```

---

## 8. Safe Change Process

1. Change one parameter group only (for example lexical thresholds only).
2. Run targeted tests for search scoring/resolvers.
3. Verify top-3 results for 5 short-prefix queries and 5 full-address queries.
4. Record before/after examples in this document.
5. Repeat for next parameter group.
