# search bar data and service.ranking metrics.supplement

> Parent: [`search-bar-data-and-service.md`](./search-bar-data-and-service.md)

## Ranking Formula Contract

Final score:

$$
S(c)=100\cdot\left(0.42T+0.30G+0.10P+0.08R+0.06U+0.04Q\right)-N
$$

Geo sub-score:

$$
G=0.30g_{marker}+0.30g_{project}+0.20g_{user}+0.20g_{viewport}
$$

Distance transform:

$$
g_x=\exp(-d_x/\tau_x)
$$

Recommended decays:

- $\tau_{marker}=1500$
- $\tau_{project}=5000$
- $\tau_{user}=8000$

Neutral defaults when signal missing:

- Missing geo signal contribution = `0.5`
- Missing priors contribution = `0.5`
- Missing context never blocks result generation

Short-prefix anti-noise penalty:

$$
N=
\begin{cases}
28,& 3\le |q|\le 6,\ prefix\_only,\ country\ mismatch,\ far\ global\\
14,& 3\le |q|\le 6,\ prefix\_only,\ far\ global\\
0,& otherwise
\end{cases}
$$

## Fallback Policy Contract

Continue if any is true:

1. No candidates in strict stage.
2. Top1 confidence is `low`.
3. Top1 text score < `0.70`.
4. Query length 3 to 6 and all top3 are flagged global-noise.

Stop if any is true:

1. Top1 confidence is `high`.
2. Top1 confidence is `medium` with margin >= `6` and at least one local explanation tag.
3. Latency ceiling reached.

Widening order (fixed):

1. Viewport + country constrained
2. Project regional
3. User priors
4. Global open

Suggestion row rule:

- Show only when correction confidence >= `0.85` and top1 score lift >= `10` points.

## Metrics And Quality Gates

| Metric                     | Definition                                                                         | Gate     |
| -------------------------- | ---------------------------------------------------------------------------------- | -------- |
| Top1 local relevance       | Ambiguous prefix queries where top1 is local-context candidate                     | >= 92%   |
| Top3 local relevance       | Ambiguous prefix queries with >= 2 local-context candidates in top3 when available | >= 95%   |
| Global noise suppression   | Ambiguous prefix top3 containing global-noise candidates                           | <= 5%    |
| Strict-stage latency p95   | End-to-end strict stage                                                            | <= 250ms |
| Complete-stage latency p95 | End-to-end complete stage                                                          | <= 900ms |
| Ranking stability          | Identical query+context with identical top3 order                                  | >= 95%   |

