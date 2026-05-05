# Coaching Rubric — Categories & Weights

> **Status:** Placeholder content. Replace with your company's real rubric before going live.

The PM is scored 1-5 in each of seven categories. The weights below convert that to a score out of 100.

| # | Category | Weight | What It Measures |
|---|---|---|---|
| 1 | **Empathy & Acknowledgment** | 13% | Did the PM make the client feel genuinely heard before pivoting to solutions? |
| 2 | **Clarity & Honesty** | 13% | Was the message delivered clearly, completely, and without spin or hedging? |
| 3 | **DISC Adaptation** | 22% | Did the PM adapt their natural communication style to fit this specific client's DISC profile? |
| 4 | **Solution Orientation** | 12% | Did the PM offer a clear path forward with options, owners, and dates? |
| 5 | **Ownership & Accountability** | 12% | Did the PM take appropriate ownership without over-blaming, deflecting, or excessive contrition? |
| 6 | **Confidence & Composure** | 13% | Did the PM stay calm and authoritative under pressure, including pushback or emotional escalation? |
| 7 | **Active Listening** | 15% | Did the PM give the client space to speak fully without interrupting, talking over, or finishing the client's thoughts? |
| | **TOTAL** | **100%** | |

---

## Why DISC Adaptation Is the Heaviest

DISC fluency is the unique communication advantage the company invests in. Every PM can be trained to be empathetic, clear, and composed — those are baseline professional skills.

DISC Adaptation is the differentiator: the ability to read what *this specific client* needs and shift to meet them, rather than running the same playbook on every client. That's what separates a great PM in this company from a generally competent one elsewhere.

The 22% weight reflects that priority.

## Why Active Listening Is Second-Heaviest

The system captures every speaker overlap and interruption during the live conversation as data. Interrupting a client — especially during a high-stakes, emotional, or financial conversation — is one of the most damaging communication failures in this industry.

The 15% weight elevates Active Listening to a first-class scoring dimension. **PM→client interruptions are penalized.** AI client→PM interruptions (when profile-appropriate, e.g., a high-D client cutting off the PM) are logged but do not affect the PM's score.

The category measures more than interruption count. It also captures:
- Did the PM let the client finish their thought before responding?
- Did the PM jump to solutions while the client was still venting?
- Did the PM finish the client's sentences for them?
- Did the PM give appropriate silence when the client needed time to process?

## Score Calculation

```
Total = (Cat1 × 0.13) + (Cat2 × 0.13) + (Cat3 × 0.22) + (Cat4 × 0.12)
        + (Cat5 × 0.12) + (Cat6 × 0.13) + (Cat7 × 0.15)
        ──────────────────────────────────────────────
                              5
        × 100
```

Equivalent: weighted average of category scores (1-5), normalized to a 0-100 scale.

**Example:**
PM scores 4, 5, 3, 4, 4, 5, 2 across the seven categories (note: a 2 in Active Listening reflects multiple interruptions).
- Weighted sum: (4×0.13) + (5×0.13) + (3×0.22) + (4×0.12) + (4×0.12) + (5×0.13) + (2×0.15)
- = 0.52 + 0.65 + 0.66 + 0.48 + 0.48 + 0.65 + 0.30 = **3.74**
- Normalized: 3.74 / 5 × 100 = **75**

That's in the "Solid — meeting the bar with clear room to grow" band, dragged down by the listening miss despite strong performance elsewhere.

---

## Adjusting the Weights

If the company wants to emphasize a different category, adjust the weights here — just keep the total at 100%. After Phase 5 ships, weights can be adjusted in the admin UI without editing this file.
