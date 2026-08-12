# Capstone Report — Refresh / Content Opportunity Scoring

- **Author:** Atif Rameez
- **Lane:** Refresh / Content Opportunity Scoring
- **Repo:** https://github.com/atif929/flyrank-ml-starter
- **Date:** <12-8-2026>

## 0. Abstract

This study investigates whether search performance and user engagement signals — impressions, clicks, average position, pageviews, and sessions — can identify webpages that should be prioritized for content refresh. Using a mid-panel month (March 2026) of the FlyRank Internship Warehouse dataset, filtered to rows with confirmed search and analytics access, a proxy refresh-priority label was built from search impressions and click-through rate, and a Decision Tree classifier was trained against a rule-based baseline that shares the label's own thresholds, on an identical 80/20 split. The baseline scores 100% by construction, since it is built from the same rule as the label; the more informative result is the Decision Tree's, which reconstructed the label with 98.45% accuracy and a 96.4% F1 score using only the five raw signals, never the rule itself. That result is genuine but modest — two of the five features are the same values the label's CTR threshold is computed from — so it reads as a consistency check more than proof of independent predictive power. The output is intended as a decision-support ranking that helps SEO teams focus manual review on high-impression, low-click pages rather than reviewing every page individually.

## 1. Problem framing

The unit of analysis is a single content page in a single reporting month. The output is a binary refresh-priority label (and, by extension, a rank: pages flagged 1 are the review queue). The action a human takes from it is a manual editorial review — deciding whether to update the title/meta description or refresh the content itself. The cost of a wrong call is asymmetric but bounded: a false positive wastes a reviewer's time on a page that didn't need attention; a false negative means a genuinely underperforming page goes unreviewed for another cycle. Neither is catastrophic, which is exactly why this is suited to a lightweight, transparent model rather than a high-stakes automated decision — it's meant to triage attention, not replace judgment. Data/ML helps here because no team can manually audit every page every month; a ranking signal turns an unbounded review task into a short, prioritized list.

## 2. Data safety

Used: `fact_content_daily_performance` (primary), filtered to the March 2026 partition (`month=2026-03`) and to rows where `gsc_data_available IS TRUE` and `ga4_data_available IS TRUE` — these flags are three-valued (TRUE/FALSE/NULL) per the warehouse documentation, and filtering with `IS TRUE` avoids silently treating "never connected" as "zero engagement." `dim_content` was referenced only for context, not as a feature source.

Excluded deliberately: the final month of the warehouse (held out to avoid using the natural outcome window as a label source), all client and content identifiers (pseudonymous, used only for row identity — never as features), and any URL, query, or credential-bearing field. This project doesn't use `trend_direction` or `trend_pct` at all — those belong to a different table's label logic (the starter CSV's `is_declining_label`), not this project's proxy label, so there's no risk of that specific leakage path here. No client names, domains, URLs, or search queries appear anywhere in `work/`, `docs/`, or `research_paper.md`.

## 3. Baseline

The baseline applies the exact same rule the label is built from: above-median impressions (median = 126.0) and at-or-below-median CTR (median ≈ 0.28%). This was a deliberate correction during development — an earlier version used a separate, hardcoded 5% CTR threshold that didn't match the label's own definition, which made the "baseline vs. model" comparison inconsistent. Reusing the label's thresholds makes the baseline a fair yardstick for what "trivial" performance looks like on this exact label, at the cost of making the baseline's own score uninformative on its own (see Section 5 and 6) — it will always match the label near-perfectly by construction, so it should be read as a floor for context, not as a competing model.

## 4. Model / analysis

Method: `DecisionTreeClassifier(max_depth=5, random_state=42)`, chosen for interpretability — a shallow tree's split logic can be read directly, which fits a decision-support tool an SEO team needs to trust, not just consume. Feature list: `gsc_impressions`, `gsc_clicks`, `gsc_avg_position` (derived as `gsc_sum_position / gsc_impressions`, since the warehouse stores a position sum rather than a precomputed average), `ga4_pageviews`, `ga4_sessions`. Left out on purpose: all identifiers, the final month's data, and anything not knowable at the moment a refresh decision would be made. Target definition, in one sentence: a page is a refresh candidate (`refresh_target = 1`) when its impressions are at or above the March 2026 sample median and its CTR is at or below the sample median.

## 5. Evaluation

Split: a single random 80/20 train/test split (`random_state=42`) — not grouped by client or time-aware, which is a real limitation for this run (see Section 6 and the checklist below); a client-holdout or forward-window split is the natural next iteration. Base rate: the majority class (`refresh_target = 0`) is 7,806 of 10,000 rows, i.e. a 78.06% base rate — worth stating plainly, since accuracy alone can just reflect that imbalance.

| Model | Accuracy | Precision | Recall | F1 Score |
|---|---|---|---|---|
| Baseline Rule | 100.0% | 100.0% | 100.0% | 100.0% |
| Decision Tree | 98.45% | 100.0% | 93.0% | 96.4% |

Error analysis: the Decision Tree's gap from perfect (1.55% of the test set, entirely on recall — it misses some true positives, produces zero false positives) means it is slightly conservative: when it flags a page as a refresh candidate it's never wrong, but it under-flags a small number of genuine candidates. Both scores sit well above the 78.06% base rate, so this isn't just base-rate mimicry — but the baseline's number specifically should not be read as "the baseline predicts well"; it is definitionally identical to the label.

## 6. Interpretation

Feature importance (Figure 2, `docs/assets/images/feature_importance.png`) shows the tree relying most heavily on `gsc_impressions` and the derived CTR relationship between impressions and clicks — expected, since those are the two inputs the label is directly computed from. `gsc_avg_position`, `ga4_pageviews`, and `ga4_sessions` contribute less. The honest interpretation is a negative result worth stating plainly: this run does not demonstrate that engagement data (pageviews, sessions) meaningfully improves on what impressions and clicks alone already encode into the label. A more convincing next test would either use a target that isn't built from the same two features being tested, or explicitly ablate the tree without `gsc_impressions`/`gsc_clicks` to see whether `avg_position` and the GA4 features carry independent signal on their own.

## 7. Recommendation

Ranked actions for an SEO team, in priority order: (1) review pages with high impressions and very low CTR first — this is the model's top-scored group; (2) for those, check whether the title/meta description undersells the page relative to what it's ranking for; (3) refresh content carefully, preserving whatever is already earning current rankings; (4) monitor performance after any change before making a second round of edits; (5) re-score periodically, since refresh priority shifts month to month. Confidence: moderate for triage purposes, low for anything beyond that — the model's strong numbers are inflated by feature overlap with the label (Section 6), so treat the ranked list as a starting point for human judgment, not a queue to execute unattended.

## 8. Reproducibility

From a fresh clone:
```powershell
git clone https://github.com/atif929/flyrank-ml-starter
cd flyrank-ml-starter
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```
Then open `work/notebooks/capstone.ipynb` in VS Code or Jupyter, select the `.venv` kernel, and Run All. You will be prompted for a Hugging Face read token (via `getpass`) — this is never hardcoded in the notebook. Random seed: `random_state=42`, used consistently for both the train/test split and the Decision Tree. Environment: `requirements.txt` pins pandas, numpy, scikit-learn, matplotlib, duckdb, huggingface_hub as shipped by the starter repo — no additional packages were added. This evaluation is not a sealed/holdout claim (Section 5 notes the split is a single random split, not time-aware or client-grouped), so no separate sealed-frame script applies here; the full pipeline from raw download to final metrics table lives entirely in `capstone.ipynb`, checkable end to end.

## 9. Acknowledgments & data credit

Built on the FlyRank ML Internship dataset. https://flyrank.ai

---

> **Claims checklist before submitting:**
> - [x] Language stays observed / measured / directional / decision-support throughout
> - [x] Base rate (78.06%) reported alongside accuracy
> - [x] No causal claims, no "predicted Google's algorithm"
> - [x] No client-identifying details anywhere in this file
> - [ ] Numbers in this report match a fresh re-run — **confirm this yourself after Step 1 below**, since this file was written from your last reported output, not a run I executed myself