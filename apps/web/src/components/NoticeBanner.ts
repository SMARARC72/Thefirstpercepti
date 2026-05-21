/**
 * ============================================================================
 * NOTICE BANNER — UI-403 DOM render
 * ============================================================================
 * Phase 20 / Wave J / UI-403. Wireframe source: NOTICE_07.html approach C
 * (Pulse-Threshold Banner — "cleanest integration with existing Pulse
 * surface · zero new screen real-estate").
 *
 * Renders the banner shown when the Notice meter crosses each rung. Reused
 * across rungs 7-10; the layout is constant, the copy + condition glyph
 * change. The 11-segment meter visualizes 0..10 with the crossed threshold
 * highlighted in lantern.
 *
 * Per the wireframe note: "Notice 8/9/10 will reuse this banner format with
 * red/lethal escalation". The escalation is encoded in a `data-rung`
 * attribute the consumer's stylesheet keys off — this file doesn't bake any
 * per-rung styling beyond that attribute.
 *
 * Voice discipline:
 *   - No emoji; banner copy comes from NoticeLadder.rungBannerCopy()
 *   - 3-letter condition glyph in the badge (MRK / RBN / NBN / CVG)
 *   - Italic prose block uses Garamond body per the design system
 * ============================================================================
 */

import {
  NOTICE_LADDER_RUNGS,
  rungBannerCopy,
  type NoticeRung,
} from "../state/NoticeLadder.js";

export interface FactionAwareness {
  factionId: string;
  factionName: string;
  /** 0..10 awareness scale; matches the wireframe's bar fill percentage. */
  awareness: number;
}

export interface NoticeBannerProps {
  rung: NoticeRung;
  /** Current notice meter — drives the meter segment fill. */
  notice: number;
  /** Aware factions, in display order. Capped at 4 for layout. */
  factions?: readonly FactionAwareness[];
  /** Authority meter — when ≥ 9 at rung 10, the banner shows the
   *  apotheosis ACCEPT/REFUSE controls instead of the standard RETURN. */
  authority?: number;
  onInspect?: () => void;
  onReturn?: () => void;
  /** Fires when the rung-10 + authority ≥ 9 player chooses to enter the
   *  Form-of-Ending. Wired to the Phase 18 x12_apotheosis ink scene. */
  onApotheosisAccept?: () => void;
  /** Fires when the rung-10 + authority ≥ 9 player refuses. Per .ink:
   *  RUIN +1, CORRUPTION +2, AUTHORITY 10 spent, 7+ day cooldown. */
  onApotheosisRefuse?: () => void;
}

const CONDITION_GLYPH: Record<NoticeRung, string> = {
  7: "MRK",
  8: "RBN", // recognized-but-not-yet-named
  9: "NBN", // named-by-not-yet-named
  10: "CVG", // convergence
};

export function createNoticeBanner(props: NoticeBannerProps): HTMLElement {
  const { rung, notice, factions = [], authority = 0 } = props;
  const { title, condition, copy } = rungBannerCopy(rung);

  const root = document.createElement("section");
  root.className = "notice-banner panel";
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", `Notice ${rung} — ${title}`);
  root.dataset.testid = "notice-banner";
  root.dataset.rung = String(rung);
  root.dataset.condition = condition;

  // ── header
  const head = document.createElement("div");
  head.className = "notice-banner-head row";
  const eyebrow = document.createElement("span");
  eyebrow.className = "eb";
  eyebrow.textContent = `PULSE · §IV.7 · CROSSING DETECTED · NOTICE ${rung}`;
  head.appendChild(eyebrow);

  const subhead = document.createElement("span");
  subhead.className = "mono";
  subhead.textContent = `${CONDITION_GLYPH[rung]} ACQUIRED`;
  head.appendChild(subhead);
  root.appendChild(head);

  // ── meter (11 segments, 0..10)
  const meter = document.createElement("div");
  meter.className = "meter notice-meter";
  meter.dataset.testid = "notice-meter";
  meter.setAttribute("role", "img");
  meter.setAttribute("aria-label", `Notice ${notice} of 10, threshold at ${rung}`);
  for (let i = 0; i <= 10; i++) {
    const seg = document.createElement("span");
    seg.className = "seg";
    if (i < notice && i !== rung) seg.classList.add("filled");
    if (i === rung) seg.classList.add("threshold");
    seg.textContent = String(i);
    meter.appendChild(seg);
  }
  root.appendChild(meter);

  // ── condition banner block (badge + copy)
  const block = document.createElement("div");
  block.className = "notice-banner-block";

  const badge = document.createElement("div");
  badge.className = "notice-banner-badge";
  badge.dataset.testid = "notice-banner-badge";
  badge.textContent = CONDITION_GLYPH[rung];
  block.appendChild(badge);

  const body = document.createElement("div");
  body.className = "notice-banner-body";
  const titleEl = document.createElement("p");
  titleEl.className = "eb";
  titleEl.textContent = `— THRESHOLD · NOTICE ${rung} · ${title.toUpperCase()} —`;
  body.appendChild(titleEl);
  const copyEl = document.createElement("p");
  copyEl.className = "notice-banner-copy";
  copyEl.textContent = copy;
  body.appendChild(copyEl);
  block.appendChild(body);

  if (props.onInspect) {
    const inspectBtn = document.createElement("button");
    inspectBtn.type = "button";
    inspectBtn.className = "btn ghost notice-banner-inspect";
    inspectBtn.textContent = "Inspect";
    inspectBtn.addEventListener("click", () => props.onInspect!());
    block.appendChild(inspectBtn);
  }

  root.appendChild(block);

  // ── faction awareness rows (max 4)
  if (factions.length > 0) {
    const awareLabel = document.createElement("p");
    awareLabel.className = "eb";
    awareLabel.textContent = "— FACTION AWARENESS · DRIVING THIS RUNG —";
    root.appendChild(awareLabel);

    const list = document.createElement("ul");
    list.className = "notice-banner-factions";
    list.setAttribute("role", "list");
    for (const f of factions.slice(0, 4)) {
      const row = document.createElement("li");
      row.className = "pulse-row";
      row.dataset.factionId = f.factionId;
      const name = document.createElement("span");
      name.className = "fc";
      name.textContent = f.factionName;
      const bar = document.createElement("div");
      bar.className = "bar";
      const fill = document.createElement("i");
      const pct = Math.max(0, Math.min(10, f.awareness)) * 10;
      fill.className = f.awareness >= 3 ? "aware" : "";
      fill.style.width = `${pct}%`;
      bar.appendChild(fill);
      const n = document.createElement("span");
      n.className = "n";
      n.textContent = f.awareness >= 3 ? `${f.awareness} · AWARE` : String(f.awareness);
      row.appendChild(name);
      row.appendChild(bar);
      row.appendChild(n);
      list.appendChild(row);
    }
    root.appendChild(list);
  }

  // ── actions row
  const actions = document.createElement("div");
  actions.className = "notice-banner-actions row";

  const isApotheosisGate = rung === 10 && authority >= 9;
  root.dataset.apotheosisGate = String(isApotheosisGate);

  if (isApotheosisGate) {
    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "btn lant";
    accept.dataset.testid = "notice-banner-apotheosis-accept";
    accept.textContent = "Speak the name yourself";
    accept.addEventListener("click", () => props.onApotheosisAccept?.());
    actions.appendChild(accept);

    const refuse = document.createElement("button");
    refuse.type = "button";
    refuse.className = "btn ghost";
    refuse.dataset.testid = "notice-banner-apotheosis-refuse";
    refuse.textContent = "Refuse · stay mortal";
    refuse.addEventListener("click", () => props.onApotheosisRefuse?.());
    actions.appendChild(refuse);
  } else {
    const ret = document.createElement("button");
    ret.type = "button";
    ret.className = "btn";
    ret.dataset.testid = "notice-banner-return";
    ret.textContent = "Return to main scene";
    ret.addEventListener("click", () => props.onReturn?.());
    actions.appendChild(ret);
  }

  root.appendChild(actions);

  return root;
}

/** Re-export rung constant so consumers can iterate at the call site. */
export { NOTICE_LADDER_RUNGS };
