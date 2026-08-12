# Search Intelligence for Content Refresh Prioritization Using Search Performance Signals

FlyRank Machine Learning Internship — Capstone Project

## 1. Abstract

Can search performance and user engagement metrics tell you which pages on a site are actually worth refreshing? That's the question this project sets out to answer. I pulled a month of search and engagement data from the FlyRank Internship Warehouse, filtered to rows with confirmed search and analytics access, built a simple proxy label for "this page probably needs a refresh," and then compared a rule-based baseline against a Decision Tree trained on the same features and the same train/test split. The baseline scores a perfect 100% on every metric, but that's not a finding — it's built from the exact same rule that defines the label, so it's really comparing the label to itself. The more interesting number is the Decision Tree's: without ever being told the threshold rule directly, it reconstructed the same label with 98.45% accuracy and a 96.4% F1 score, using only the five raw signals. I'm not going to oversell that — two of those five signals are the same values the label's CTR threshold comes from, so this is closer to a consistency check than proof the model found some independent pattern. Even with that caveat, it's a reasonable first step toward the real goal: giving SEO teams a way to triage which pages deserve a look, instead of reviewing everything by hand.

## 2. Introduction

Most content teams don't have a systematic way to decide which pages need attention. Someone eventually notices a page is underperforming, or a stakeholder asks about it, and then it gets reviewed — but there's no consistent process for surfacing candidates in the first place. Given how much content a mid-size site accumulates, manually auditing every page just isn't realistic.

The idea behind this project is straightforward: search platforms already give you signals — how often a page shows up in search, how many people click it, where it ranks, how people behave once they land on it — and those signals should say something about whether a page is worth revisiting. If that's true, a model (or even a simple rule) could rank pages by refresh priority and let teams focus their limited review time where it actually matters, instead of spreading it evenly across everything.

## 3. Data

I worked with the FlyRank Internship Warehouse, a public internship-safe release hosted on Hugging Face. The main table is `fact_content_daily_performance`; `dim_content` is referenced only where needed for context.

For the modeling window I used March 2026 (`month=2026-03`) rather than the most recent month in the dataset. This wasn't arbitrary — the final month is the natural outcome window for anything you'd want to predict, so training or labeling against it risks leaking information from the future into the model. Sticking to a mid-panel month avoids that trap.

I also learned partway through that the warehouse's `gsc_data_available` and `ga4_data_available` flags aren't simple booleans — they can be `TRUE`, `FALSE`, or `NULL`, and treating a blank as "zero engagement" would have silently mixed "never connected" pages in with real, low-activity ones. I filtered to `IS TRUE` on both flags before sampling, which is the correct way to handle a three-valued flag like this.

I loaded the March partition directly from the Hugging Face-hosted Parquet file using DuckDB, and worked with a sample of 10,000 rows across 31 columns, all with confirmed search and analytics access. No client names, domains, URLs, search queries, or credentials appear anywhere in this notebook or on the deployed page — everything here is safe to share publicly.

## 4. Methodology

**Assumptions.** I'm assuming search performance and engagement data actually carry signal about refresh need. I'm not assuming this model should make decisions on its own — it's meant to support a human reviewer, not replace one.

**Features.** I kept the feature set small and defensible: `gsc_impressions`, `gsc_clicks`, `gsc_avg_position`, `ga4_pageviews`, and `ga4_sessions`. The warehouse only stores a position *sum*, not a precomputed average, so I derived `gsc_avg_position` as `gsc_sum_position / gsc_impressions`. All five are things you'd know before deciding whether to refresh a page — none of them depend on knowing what happens after the fact.

**Label.** I built a proxy label rather than using an actual editorial decision (which the dataset doesn't have). A page counts as a refresh candidate if it's above the median on impressions (median = 126.0) and at or below the median on click-through rate (median CTR ≈ 0.28%). That split gave me 7,806 pages labeled "not a priority" and 2,194 labeled "refresh candidate" out of the 10,000 sampled rows.

**Baseline.** I initially built the baseline as a separate rule with its own thresholds, but realized that made it inconsistent with the label — it wasn't actually testing the same definition of "refresh candidate." I corrected it to reuse the exact same median-impressions, median-CTR thresholds the label is built from. That makes the comparison consistent, but it also means the baseline's score reflects the label's own definition rather than independent skill — I address that directly in Results rather than let a perfect score speak for itself.

**Validation.** Both the baseline and the Decision Tree were scored on the exact same 80/20 split (`random_state=42`) of the same sampled data, so the comparison is apples-to-apples.

**Leakage checks.** I didn't feed any future performance metrics or hand-assigned labels into the model, and I dropped client and content identifiers before building features, since those are pseudonymous grouping keys, not signals.

## 5. Results

I trained a Decision Tree (`max_depth=5`) on the five features above and compared it to the rule-based baseline on the same test split.

| Model | Accuracy | Precision | Recall | F1 Score |
|---|---|---|---|---|
| Baseline Rule | 100.0% | 100.0% | 100.0% | 100.0% |
| Decision Tree | 98.45% | 100.0% | 93.0% | 96.4% |

I want to be upfront about what these numbers actually mean, because a row of perfect 100%s looks impressive out of context and it isn't earned here. The baseline is built from the exact same impressions/CTR rule that defines the label — so of course it matches the label almost exactly. That's not the baseline demonstrating skill; it's the label being compared to a copy of itself.

The number that actually tells you something is the Decision Tree's. It never saw the threshold rule directly — only the five raw signals — and still reconstructed the label with 98.45% accuracy and a 96.4% F1 score. That's a genuine result, but I'm not going to inflate it: two of those five features, impressions and clicks, are literally the values the label's CTR threshold is computed from. So this is better read as "the label is highly learnable from its own underlying signals" rather than "the model found some independent predictive pattern." A more convincing test would train on features that don't directly construct the label — that's the natural next step, not something I'm claiming to have already done.

*(Figure 1 — refresh-target class distribution — and Figure 2 — Decision Tree feature importance — are included on the deployed page; see `docs/assets/images/`.)*

## 6. Limitations

This project leans on historical data only, filtered to pages with confirmed search and analytics access. The label itself is a proxy — above-median impressions with low CTR — rather than an actual editorial call, so it's a stand-in for ground truth, not ground truth itself. The baseline, because it shares the label's exact thresholds, isn't an independent point of comparison — its perfect score is a product of that construction, not evidence of anything. And because two of the model's five features are the same values the label is computed from, the Decision Tree's strong result should be read as a consistency check more than proof of independent predictive skill. I evaluated on one sampled month and one split; I haven't checked whether the same pattern holds across other months.

More broadly: everything here is observed and directional. It's meant to support a decision, not prove one. Nothing in this project claims to know how any search engine's ranking algorithm actually works, and nothing here should be read as causal.

## 7. Ranked Recommendations

Based on what the model surfaces — pages with real search visibility but weak click-through — here's what I'd suggest a team actually do with this:

1. Start with pages that have high impressions and very low CTR; they're the clearest candidates.
2. For those, check whether the title and meta description are underselling the page relative to what it's ranking for.
3. When refreshing, be careful not to disturb whatever is already earning the page its current rankings.
4. After any update, give it time and watch the numbers before making a second round of changes.
5. Re-run the scoring periodically — refresh priority isn't static, and new performance data should reshuffle the list.

These are starting points for a human reviewer, not a queue to execute blindly.

## 8. Reproducibility

Everything here comes from `work/notebooks/capstone.ipynb`. It downloads the March 2026 partition of `fact_content_daily_performance` from the FlyRank Internship Warehouse using an authenticated Hugging Face read token, filters to rows with confirmed GSC and GA4 access, loads the result with DuckDB, builds the features and label described in Section 4, and trains both the baseline and the Decision Tree on the same split. Running it top to bottom reproduces every number in this paper — nothing here was computed separately or by hand.

## 9. Acknowledgements

Built on the FlyRank ML Internship dataset. https://flyrank.ai