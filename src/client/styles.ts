/**
 * CSS for the SCM popup.
 *
 * Colours come from the host alias tokens only (--dsw-alias-*), so the panel
 * follows every theme/skin the way the official conversation surface does.
 * Everything is prefixed dshg- to stay collision-free with other plugins.
 *
 * IMPORTANT — every floating surface paints on an OPAQUE base. Skins (the
 * "abyss" dream skin among them) declare --dsw-alias-bg-layer-* WITH ALPHA so
 * artwork shows through panels; a dialog that inherits that lets the page text
 * underneath read straight through it. So popup surfaces composite the layer
 * over the page base themselves (see surfaceRule below) instead of trusting a
 * single token to be opaque.
 *
 * NOTE: this file is a template literal. Never put a backtick inside CSS, not
 * even in a comment — it ends the string.
 */

/**
 * How a floating surface gets painted, and why it is two declarations:
 *
 *   background-color: var(--dsw-alias-bg-base);            <- opaque floor
 *   background-image: linear-gradient(LAYER, LAYER);        <- themed tint on top
 *
 * `color-mix(x 100%, transparent)` does NOT raise alpha — at 100% weight the
 * result is just `x`, alpha included. Skins hand out layers with alpha, so the
 * only reliable opaque result is compositing the layer over the page base, which
 * is exactly what these two declarations do. If the skin also makes the base
 * translucent, the gradient is repeated so alpha composites down geometrically.
 */
const SURFACE_LAYER = 'var(--dsw-alias-bg-layer-1)'
const MENU_LAYER = 'var(--dsw-alias-bg-layer-2)'

function surfaceRule(layer: string): string {
  const tint = `linear-gradient(${layer},${layer})`
  return `background-color:var(--dsw-alias-bg-base);background-image:${tint},${tint},${tint}`
}

export const SURFACE_CSS = surfaceRule(SURFACE_LAYER)
export const MENU_CSS = surfaceRule(MENU_LAYER)

export const CSS = `
/**
 * Every floating surface carries the same opaque recipe (see surfaceRule above):
 * menus and the confirm box render as SIBLINGS of .dshg-root (they must escape
 * its overflow:hidden), so each one paints its own background rather than
 * inheriting a variable from the dialog.
 */


.dshg-trigger{flex:none;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;line-height:1}
.dshg-trigger svg{width:15px;height:15px}
.dshg-trigger:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshg-trigger-on{background:var(--dsw-alias-interactive-bg-active);color:var(--dsw-alias-label-primary)}
.dshg-trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}
/**
 * Two entries exist in the DOM at once: the root-scoped global one (always) and
 * the session-scoped one (only while a conversation is open). Show exactly one:
 * once a session button is mounted, suppress the global fallback. :has() on the
 * root element keeps the rule working from either button's stylesheet position.
 */
html:has(.dshg-trigger-session) .dshg-trigger-global{display:none}

/**
 * The shell is a column: header / banner / tabs / commit box / body / footer.
 * isolation:isolate keeps the page behind from compositing through, and the
 * background is the flattened surface token rather than a raw alias layer.
 */
[data-dsh-plugin="wagq-dsh-git"] svg:not([width]){width:14px;height:14px;flex:none}
.dshg-root{font:inherit;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;${SURFACE_CSS};isolation:isolate;border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 18px 48px -12px rgba(0,0,0,.42),0 4px 14px -6px rgba(0,0,0,.28);overflow:hidden;height:auto;max-height:min(78vh,700px);min-height:0}
/**
 * With a side panel open the shell needs a FIXED height: the two columns only
 * split correctly against a resolved height, and the list must scroll instead of
 * stretching the dialog. Empty/short states still auto-size without the panel.
 */
.dshg-root[data-side=true]{height:min(74vh,660px)}

/* ---- header ---- */
.dshg-head{flex:none;display:flex;align-items:center;gap:8px;padding:9px 8px 8px 12px;${SURFACE_CSS};border-bottom:.5px solid var(--dsw-alias-border-l3)}
.dshg-title{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;line-height:18px;white-space:nowrap;flex:none}
.dshg-title svg{width:14px;height:14px;color:var(--dsw-alias-label-secondary)}
.dshg-repo{min-width:0;font-size:12px;line-height:16px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:6px}
.dshg-branch{display:inline-flex;align-items:center;gap:4px;flex:none;height:20px;padding:0 7px;border-radius:99px;background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshg-branch svg{width:11px;height:11px;flex:none}
.dshg-branch-btn{cursor:pointer;font:inherit;font-size:11px;padding:0 8px;height:22px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-3);border-color:var(--dsw-alias-border-l2)}
.dshg-branch-btn:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-state-business-primary)}
.dshg-branch-tag{margin-left:2px;padding:0 4px;border-radius:3px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 24%,transparent);color:var(--dsw-alias-state-warn-primary);font-size:9px}
.dshg-ahead{display:inline-flex;align-items:center;gap:4px;white-space:nowrap;flex:none;height:22px;padding:0 7px;border:.5px solid transparent;border-radius:99px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:11px;font-variant-numeric:tabular-nums;cursor:pointer;line-height:1}
.dshg-ahead:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3)}
.dshg-ahead-on{background:var(--dsw-alias-interactive-bg-active);border-color:var(--dsw-alias-state-business-primary)}
.dshg-ahead-up{color:var(--dsw-alias-state-success-primary)}
.dshg-ahead-down{color:var(--dsw-alias-state-warn-primary)}
.dshg-ahead-even{color:var(--dsw-alias-label-quaternary);letter-spacing:.06em}
.dshg-spacer{flex:1;min-width:4px}
.dshg-iconbtn{flex:none;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;line-height:1}
.dshg-iconbtn svg{width:15px;height:15px}
.dshg-iconbtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshg-iconbtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}
.dshg-iconbtn[disabled]{opacity:.45;cursor:default;background:transparent}
.dshg-iconbtn.dshg-spinning svg{animation:dshg-spin .8s linear infinite}
@keyframes dshg-spin{to{transform:rotate(360deg)}}

/* ---- commit box ---- */
.dshg-commit{flex:none;padding:10px 12px 9px;display:flex;flex-direction:column;gap:8px;${SURFACE_CSS};border-bottom:.5px solid var(--dsw-alias-border-l3)}
.dshg-msg{box-sizing:border-box;width:100%;height:54px;min-height:42px;max-height:132px;resize:vertical;font:inherit;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 9px;outline:none}
.dshg-msg::placeholder{color:var(--dsw-alias-label-quaternary)}
.dshg-msg:focus{border-color:var(--dsw-alias-state-business-primary)}
.dshg-commitrow{display:flex;align-items:stretch;border-radius:7px;overflow:hidden;background:var(--dsw-alias-state-business-primary)}
.dshg-primary{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 12px;border:0;border-radius:0;font:inherit;font-size:12.5px;font-weight:500;color:var(--dsw-alias-label-primary-inverted);background:transparent;cursor:pointer;white-space:nowrap;flex:1;min-width:0}
.dshg-primary:hover{background:rgba(255,255,255,.1)}
.dshg-primary[disabled]{opacity:.5;cursor:default;background:transparent}
.dshg-primary svg{width:13px;height:13px}
.dshg-split-arrow{flex:none;width:28px;border:0;border-left:.5px solid rgba(0,0,0,.28);display:inline-flex;align-items:center;justify-content:center;background:transparent;color:var(--dsw-alias-label-primary-inverted);cursor:pointer;padding:0;line-height:1}
.dshg-split-arrow svg{width:13px;height:13px}
.dshg-split-arrow:hover{background:rgba(255,255,255,.12)}
.dshg-split-arrow[disabled]{opacity:.5;cursor:default;background:transparent}
.dshg-subrow{display:flex;align-items:center;gap:8px;min-height:14px}
.dshg-check{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--dsw-alias-label-tertiary);cursor:pointer;user-select:none}
.dshg-check input{accent-color:var(--dsw-alias-state-business-primary);margin:0;width:12px;height:12px}
/* "Generate commit message" sits next to the amend toggle; it is a quiet action,
 * not a primary one, because committing is still the primary action. */
.dshg-genbtn{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:99px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;white-space:nowrap;line-height:1}
.dshg-genbtn svg{width:12px;height:12px;flex:none;color:var(--dsw-alias-state-business-primary)}
.dshg-genbtn:hover:not([disabled]){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-state-business-primary)}
.dshg-genbtn[disabled]{opacity:.45;cursor:default}

/* ---- section list ---- */
.dshg-body{flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:row;overflow:hidden}
.dshg-root[data-side=true] .dshg-body{flex:1 1 auto;min-height:180px}
/* Direct children of .dshg-body are the columns; each must be able to scroll. */
.dshg-body > *{min-width:0;min-height:0}
.dshg-list{flex:1 1 auto;min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable}
/* Only constrain the list when a diff / detail panel actually shares the row. */
.dshg-root[data-side=true] .dshg-list{flex:0 0 clamp(200px,26%,300px)}
.dshg-list::-webkit-scrollbar{width:10px}
.dshg-list::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l1);border-radius:5px;border:2px solid transparent;background-clip:content-box}
.dshg-list::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l1);background-clip:content-box}
.dshg-section{display:flex;flex-direction:column}
.dshg-sechead{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:5px;padding:5px 8px 5px 4px;${SURFACE_CSS};border-bottom:.5px solid var(--dsw-alias-border-l3);cursor:pointer;user-select:none}
.dshg-sechead:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshg-caret{flex:none;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);transition:transform .12s ease}
.dshg-caret svg{width:12px;height:12px}
.dshg-caret[data-open=false]{transform:rotate(-90deg)}
.dshg-sectitle{font-size:11px;font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-secondary)}
.dshg-count{min-width:16px;height:16px;padding:0 5px;display:inline-flex;align-items:center;justify-content:center;border-radius:99px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:1;font-variant-numeric:tabular-nums}
.dshg-secactions{margin-left:auto;display:flex;align-items:center;gap:2px}
.dshg-mini{min-width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:0 3px;line-height:1;font:inherit;font-size:10px}
.dshg-mini svg{width:13px;height:13px}
.dshg-mini:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshg-mini[disabled]{opacity:.4;cursor:default;background:transparent}
.dshg-viewtoggle{letter-spacing:.02em}

/* ---- file row (VS Code SCM row: name … [5, M] then hover actions) ---- */
.dshg-row{display:flex;align-items:center;gap:6px;min-height:24px;padding:0 8px 0 4px;cursor:pointer;background:transparent;border:0;width:100%;text-align:left;font:inherit;color:inherit}
.dshg-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshg-row[data-active=true]{background:var(--dsw-alias-interactive-bg-active)}
.dshg-row:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dshg-rowname{min-width:0;flex:1 1 auto;font-size:12px;line-height:22px;padding-left:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
.dshg-rowdir{color:var(--dsw-alias-label-quaternary)}
.dshg-rowdeco{flex:none;display:inline-flex;align-items:center;gap:6px;padding-right:2px}
.dshg-rowletter{flex:none;min-width:12px;text-align:right;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}
.dshg-rowstat{flex:none;font-size:10.5px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-quaternary);display:inline-flex;gap:4px}
.dshg-add{color:var(--dsw-alias-state-success-primary)}
.dshg-del{color:var(--dsw-alias-state-error-primary)}
.dshg-rowbtns{flex:none;display:none;align-items:center;gap:1px}
.dshg-row:hover .dshg-rowbtns,.dshg-row[data-active=true] .dshg-rowbtns{display:inline-flex}
.dshg-row:hover .dshg-rowdeco,.dshg-row[data-active=true] .dshg-rowdeco{display:none}
.dshg-letter-M{color:var(--dsw-alias-state-warn-primary)}
.dshg-letter-A{color:var(--dsw-alias-state-success-primary)}
.dshg-letter-D{color:var(--dsw-alias-state-error-primary)}
.dshg-letter-R{color:var(--dsw-alias-state-business-primary)}
.dshg-letter-U{color:var(--dsw-alias-state-success-primary)}
.dshg-letter-C{color:var(--dsw-alias-label-tertiary)}
.dshg-letter-T{color:var(--dsw-alias-state-warn-primary)}

/* ---- graph ---- */
.dshg-grow{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;height:26px;padding-right:8px;cursor:pointer;border:0;background:transparent;width:100%;text-align:left;font:inherit;color:inherit}
.dshg-grow:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshg-grow:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dshg-grow-head{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 10%,transparent)}
.dshg-grow-on{background:var(--dsw-alias-interactive-bg-active);box-shadow:inset 2px 0 0 var(--dsw-alias-state-business-primary)}
.dshg-gsvg{flex:none;display:block;overflow:visible}
.dshg-gmeta{min-width:0;display:flex;align-items:center;gap:6px}
.dshg-gsubject{min-width:0;font-size:12px;line-height:22px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshg-gref{flex:none;max-width:120px;height:16px;padding:0 5px;display:inline-flex;align-items:center;border-radius:4px;font-size:10px;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 18%,transparent);color:var(--dsw-alias-state-business-primary);border:.5px solid color-mix(in srgb,var(--dsw-alias-state-business-primary) 36%,transparent)}
.dshg-gref[data-kind=tag]{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);border-color:var(--dsw-alias-border-l3)}
.dshg-gref[data-kind=remote]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 16%,transparent);color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 34%,transparent)}
.dshg-gside{flex:none;display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-quaternary);font-variant-numeric:tabular-nums}
.dshg-gsha{font-family:var(--dsh-code-font-family,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11px}

/* ---- diff viewer (side panel) ----
 * The diff lives BESIDE the list, not under it: the popup widens and the body
 * becomes a two-column split, so the change list keeps its height and the diff
 * gets the full panel height instead of a sliver at the bottom.
 */
.dshg-list-graph{padding-bottom:4px}
.dshg-sechead.dshg-static{cursor:default;position:sticky;top:0;z-index:2}
.dshg-diff{flex:1 1 auto;min-width:0;border-left:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-base);display:flex;flex-direction:column;min-height:0;max-height:none}
.dshg-diffhead{flex:none;display:flex;align-items:center;gap:6px;padding:5px 8px;border-bottom:.5px solid var(--dsw-alias-border-l3);font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dshg-diffhead svg{width:12px;height:12px;flex:none}
.dshg-diffpath{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
.dshg-diffbody{flex:1;min-height:0;overflow:auto;font-family:var(--dsh-code-font-family,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11.5px;line-height:1.55}
.dshg-difftable{border-collapse:collapse;width:100%;table-layout:fixed}
.dshg-hunk{background:var(--dsw-alias-markdown-code-block-banner);color:var(--dsw-alias-label-tertiary)}
.dshg-hunk td{padding:2px 8px;font-size:11px;word-break:break-all}
.dshg-num{width:36px;min-width:36px;padding:0 5px;text-align:right;color:var(--dsw-alias-label-quaternary);user-select:none;vertical-align:top;font-variant-numeric:tabular-nums}
.dshg-code{padding:0 8px 0 2px;white-space:pre-wrap;word-break:break-word;vertical-align:top}
.dshg-ln-add{background:var(--dsw-alias-file-diff-added-bg)}
.dshg-ln-del{background:var(--dsw-alias-file-diff-deleted-bg)}
.dshg-ln-add .dshg-num{background:var(--dsw-alias-file-diff-added-gutter)}
.dshg-ln-del .dshg-num{background:var(--dsw-alias-file-diff-deleted-gutter)}
.dshg-diffempty{padding:14px;text-align:center;font-size:12px;color:var(--dsw-alias-label-tertiary);word-break:break-word}

/* ---- side-by-side diff (VS Code style) ----
 * Each side is EXACTLY half of the visible width. The grid must never size itself
 * to its longest line (that made one column run off the panel and forced a
 * horizontal scroll to read anything), so columns are minmax(0,1fr) with
 * overflow hidden and the code cells wrap inside their own half.
 */
.dshg-diffbody-split{overflow:auto;overflow-x:hidden}
.dshg-splitview{display:flex;flex-direction:column;width:100%;min-width:0}
.dshg-srow{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);width:100%;min-width:0}
.dshg-scell{display:grid;grid-template-columns:34px 12px minmax(0,1fr);align-items:start;min-width:0;overflow:hidden;padding-right:4px}
.dshg-scell + .dshg-scell{border-left:.5px solid var(--dsw-alias-border-l3)}
.dshg-snum{padding:0 4px;text-align:right;color:var(--dsw-alias-label-quaternary);user-select:none;font-variant-numeric:tabular-nums;font-size:10.5px;overflow:hidden}
.dshg-smark{user-select:none;color:var(--dsw-alias-label-quaternary);text-align:center}
.dshg-scode{min-width:0;padding-right:2px;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}
.dshg-scell.dshg-ln-add .dshg-snum{background:var(--dsw-alias-file-diff-added-gutter)}
.dshg-scell.dshg-ln-del .dshg-snum{background:var(--dsw-alias-file-diff-deleted-gutter)}
.dshg-scell.dshg-ln-add .dshg-smark{color:var(--dsw-alias-state-success-primary)}
.dshg-scell.dshg-ln-del .dshg-smark{color:var(--dsw-alias-state-error-primary)}
/* A cell with no counterpart on that side: hatched, so it reads as "nothing here". */
.dshg-ln-void{background:repeating-linear-gradient(135deg,transparent 0 6px,var(--dsw-alias-bg-layer-2) 6px 12px)}
.dshg-ln-void .dshg-snum,.dshg-ln-void .dshg-scode{opacity:.35}
.dshg-shunk{grid-column:1/-1;padding:2px 8px;font-size:11px;word-break:break-all;background:var(--dsw-alias-markdown-code-block-banner);color:var(--dsw-alias-label-tertiary)}

/* ---- states ---- */
.dshg-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:34px 20px;text-align:center;color:var(--dsw-alias-label-tertiary)}
.dshg-empty svg{width:24px;height:24px;color:var(--dsw-alias-label-quaternary)}
.dshg-empty-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.dshg-empty-body{font-size:11.5px;line-height:1.6;max-width:34em}
.dshg-err{margin:8px 12px;padding:7px 10px;border-radius:8px;border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,var(--dsw-alias-bg-base));color:var(--dsw-alias-state-error-primary);font-size:11.5px;line-height:1.5;word-break:break-word;max-height:96px;overflow:auto}
.dshg-err-close{float:right;border:0;background:transparent;color:inherit;cursor:pointer;font-size:14px;line-height:1;padding:0 2px}
.dshg-loading{display:flex;align-items:center;justify-content:center;gap:8px;padding:26px;color:var(--dsw-alias-label-tertiary);font-size:12px}
.dshg-foot{flex:none;display:flex;align-items:center;gap:10px;padding:5px 10px;border-top:.5px solid var(--dsw-alias-border-l3);font-size:11px;color:var(--dsw-alias-label-quaternary);${SURFACE_CSS};white-space:nowrap;overflow:hidden}
.dshg-foot b{font-weight:500;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}

/* ---- tabs ---- */
.dshg-tabs{flex:none;display:flex;align-items:center;gap:2px;padding:0 10px;border-bottom:.5px solid var(--dsw-alias-border-l3);${SURFACE_CSS}}
.dshg-tab{position:relative;display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 8px;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.dshg-tab:hover{color:var(--dsw-alias-label-primary)}
.dshg-tab-on{color:var(--dsw-alias-label-primary);font-weight:500}
.dshg-tab-on:after{content:'';position:absolute;left:8px;right:8px;bottom:-1px;height:2px;border-radius:2px;background:var(--dsw-alias-state-business-primary)}
.dshg-tab .dshg-count{margin-left:1px}

/* ---- menu / popover (floating: owns its own opaque surface) ---- */
.dshg-menu{position:fixed;z-index:2147482100;display:flex;flex-direction:column;padding:4px;${MENU_CSS};isolation:isolate;border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;box-shadow:0 14px 40px -10px rgba(0,0,0,.5),0 3px 10px -4px rgba(0,0,0,.3);max-height:min(70vh,520px);overflow:hidden}
.dshg-menu-scroll{overflow:auto;max-height:min(46vh,340px)}
.dshg-menu-head{padding:5px 8px 3px;font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-quaternary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dshg-menu-item{display:flex;align-items:center;gap:8px;width:100%;min-height:26px;padding:3px 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;cursor:pointer}
.dshg-menu-item:hover:not([disabled]){background:var(--dsw-alias-interactive-bg-hover)}
.dshg-menu-item[disabled]{opacity:.45;cursor:default}
.dshg-menu-danger{color:var(--dsw-alias-state-error-primary)}
.dshg-menu-current{color:var(--dsw-alias-state-business-primary)}
.dshg-menu-icon{flex:none;width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary)}
.dshg-menu-icon svg{width:13px;height:13px}
.dshg-menu-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshg-menu-hint{flex:none;font-size:10.5px;color:var(--dsw-alias-label-quaternary);font-variant-numeric:tabular-nums}
.dshg-menu-sep{height:1px;margin:4px 6px;background:var(--dsw-alias-border-l3)}
.dshg-input{box-sizing:border-box;width:100%;height:28px;margin:2px 0 4px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;outline:none}
.dshg-input:focus{border-color:var(--dsw-alias-state-business-primary)}
.dshg-branchpicker{padding:8px}
.dshg-branchpicker .dshg-menu-scroll{margin:0 -4px}
.dshg-branchnew{margin-top:4px;padding-top:6px;border-top:.5px solid var(--dsw-alias-border-l3)}
.dshg-branchnew .dshg-input{margin:0}

/* ---- confirm dialog ---- */
.dshg-confirm-mask{position:fixed;inset:0;z-index:2147482200;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-mask-1,#00000059);backdrop-filter:blur(2px)}
.dshg-confirm{width:min(380px,calc(100vw - 32px));padding:16px;border-radius:12px;${SURFACE_CSS};isolation:isolate;border:.5px solid var(--dsw-alias-border-l2);box-shadow:0 20px 50px -12px rgba(0,0,0,.55)}
.dshg-confirm-title{font-size:13px;font-weight:600;margin-bottom:8px}
.dshg-confirm-body{font-size:12px;line-height:1.65;color:var(--dsw-alias-label-secondary);word-break:break-word}
.dshg-confirm-fields{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.dshg-confirm-field{display:flex;flex-direction:column;gap:4px}
.dshg-confirm-field > span{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dshg-confirm-field .dshg-input{margin:0;height:30px}
.dshg-confirm-ok{padding:0 14px;flex:none}
.dshg-confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
.dshg-ghost{display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
.dshg-ghost:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshg-danger-btn{display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 12px;border:0;border-radius:7px;background:var(--dsw-alias-state-error-primary);color:#fff;font:inherit;font-size:12px;font-weight:500;cursor:pointer}
.dshg-danger-btn:hover{filter:brightness(1.08)}

/* ---- GitLab-style commit detail ---- */
.dshg-gitlab-head{flex:none;padding:10px 14px;border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dshg-gitlab-title{font-size:13px;font-weight:600;line-height:1.5;color:var(--dsw-alias-label-primary);word-break:break-word}
.dshg-gitlab-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:6px;font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dshg-gitlab-count{font-weight:500;color:var(--dsw-alias-label-secondary)}
.dshg-gitlab-body{margin:8px 0 0;font-family:var(--dsh-code-font-family,ui-monospace,monospace);font-size:11px;line-height:1.55;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word;max-height:90px;overflow:auto}
.dshg-gitlab-files{flex:none}
.dshg-gitlab-file{border-bottom:.5px solid var(--dsw-alias-border-l3)}
.dshg-gitlab-row{display:flex;align-items:center;gap:8px;min-height:34px;padding:4px 10px;position:sticky;top:0;z-index:2;background:var(--dsw-alias-bg-layer-1)}
.dshg-gitlab-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
/* Direct icons in the file row (file type glyph) — without this the bare <svg>
 * has no width constraint and blows up to the browser default. */
.dshg-gitlab-row > svg{width:14px;height:14px;flex:none;color:var(--dsw-alias-label-tertiary)}
.dshg-gitlab-toggle{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex:none;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:0}
.dshg-gitlab-toggle svg{width:12px;height:12px;transform:rotate(-90deg);transition:transform .12s}
.dshg-gitlab-file-open .dshg-gitlab-toggle svg{transform:rotate(0deg)}
.dshg-gitlab-path{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;font-size:11.5px;color:var(--dsw-alias-label-primary);font-family:var(--dsh-code-font-family,ui-monospace,monospace)}
.dshg-gitlab-diff{border-top:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-base);overflow:auto;max-height:50vh}
.dshg-cmeta-row-inline{font-size:11px;color:var(--dsw-alias-label-tertiary)}

/* ---- commit detail (legacy tokens kept for other views) ---- */
/* Same column geometry as the compare panel: a flex child that shares the row.
 * flex:0 0 auto would let the content pick its own width (a long patch line
 * pushed it past 1000000px and squeezed the list to 0) — it must share instead.
 */
.dshg-cdetail{flex:1 1 60%;min-width:320px}
.dshg-cmeta{flex:none;padding:8px 10px;border-bottom:.5px solid var(--dsw-alias-border-l3);display:flex;flex-direction:column;gap:5px;font-family:inherit}
.dshg-cmeta-subject{font-size:12.5px;font-weight:600;line-height:1.45;word-break:break-word}
.dshg-cmeta-row{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--dsw-alias-label-tertiary);flex-wrap:wrap}
.dshg-cmeta-body{margin:0;font-family:var(--dsh-code-font-family,ui-monospace,monospace);font-size:11px;line-height:1.55;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word;max-height:80px;overflow:auto}
.dshg-cmeta-files{display:flex;flex-direction:column;gap:1px;max-height:88px;overflow:auto}
.dshg-cfile{display:flex;align-items:center;gap:8px;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
.dshg-cfile-name{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
/* commit detail: file navigation + sticky per-file headings */
.dshg-cdetail-nav{flex:none;display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:.5px solid var(--dsw-alias-border-l3);overflow-x:auto;scrollbar-width:thin}
.dshg-cdetail-nav-title{flex:none;font-size:11px;font-weight:600;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dshg-cdetail-nav-toggle{flex:none;display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap}
.dshg-cdetail-nav-toggle svg{width:12px;height:12px;transition:transform .15s}
.dshg-cdetail-nav-expanded{display:block;max-height:190px;overflow-y:auto;white-space:normal}
.dshg-cdetail-nav-expanded .dshg-cdetail-nav-toggle svg{transform:rotate(180deg)}
.dshg-cdetail-nav-full{max-width:none;width:100%;margin-top:4px;justify-content:flex-start}
.dshg-cdetail-nav-name-full{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;text-align:left}
.dshg-cdetail-nav-item{flex:none;display:inline-flex;align-items:center;gap:6px;max-width:220px;height:24px;padding:0 9px;border:.5px solid var(--dsw-alias-border-l2);border-radius:99px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;white-space:nowrap}
.dshg-cdetail-nav-item:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshg-cdetail-nav-on{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary)}
.dshg-cdetail-nav-name{overflow:hidden;text-overflow:ellipsis}
.dshg-cdetail-nav-stat{flex:none;font-size:10px;font-variant-numeric:tabular-nums}
.dshg-cdetail-body{position:relative}
.dshg-cfile-section{scroll-margin-top:4px}
.dshg-cfile-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;padding:5px 10px;background-color:var(--dsw-alias-bg-base);background-image:linear-gradient(var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-2));border-top:.5px solid var(--dsw-alias-border-l2);border-bottom:.5px solid var(--dsw-alias-border-l3);font-size:11.5px;color:var(--dsw-alias-label-primary)}
.dshg-cfile-head svg{width:13px;height:13px;flex:none;color:var(--dsw-alias-label-tertiary)}
.dshg-cfile-head-name{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsh-code-font-family,ui-monospace,monospace)}

/* ---- upstream compare ---- */
.dshg-compare{flex:1 1 60%;min-width:320px}
.dshg-cmp-body{display:flex;flex-direction:column;font-family:inherit}
.dshg-cmp-group{display:flex;flex-direction:column}
.dshg-cmp-arrow{flex:none;width:14px;text-align:center;font-size:12px;font-weight:700;line-height:1}
.dshg-cmp-in{color:var(--dsw-alias-state-warn-primary)}
.dshg-cmp-out{color:var(--dsw-alias-state-success-primary)}
.dshg-cmp-row{display:flex;align-items:center;gap:8px;min-height:24px;padding:0 8px;cursor:pointer;background:transparent}
.dshg-cmp-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshg-cmp-row:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dshg-cmp-subject{min-width:0;flex:1;font-size:12px;line-height:22px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshg-cmp-empty{padding:8px 12px;font-size:11px;color:var(--dsw-alias-label-quaternary)}

/* ---- conflicts ---- */
.dshg-row-conflict .dshg-rowname{color:var(--dsw-alias-state-error-primary);font-weight:500}
.dshg-conflict-group .dshg-sechead svg{color:var(--dsw-alias-state-error-primary)}
.dshg-conflict .dshg-diffhead svg{color:var(--dsw-alias-state-error-primary)}
.dshg-cf-actions{flex:none;display:flex;gap:8px;padding:8px 10px;border-bottom:.5px solid var(--dsw-alias-border-l3)}
.dshg-cf-btn{flex:1;height:28px;border:.5px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px;cursor:pointer;white-space:nowrap}
.dshg-cf-btn:hover:not([disabled]){background:var(--dsw-alias-interactive-bg-hover)}
.dshg-cf-btn[disabled]{opacity:.5;cursor:default}
.dshg-cf-ours{border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 50%,transparent)}
.dshg-cf-theirs{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 50%,transparent)}
.dshg-cf-body{overflow:auto}
.dshg-cf-sides{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-width:0}
.dshg-cf-col{min-width:0;overflow:hidden}
.dshg-cf-col + .dshg-cf-col{border-left:.5px solid var(--dsw-alias-border-l3)}
.dshg-cf-head{position:sticky;top:0;z-index:1;padding:4px 8px;font-size:11px;font-weight:600;line-height:1.6;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary)}
.dshg-cf-head.dshg-cf-ours{color:var(--dsw-alias-state-business-primary)}
.dshg-cf-head.dshg-cf-theirs{color:var(--dsw-alias-state-success-primary)}
.dshg-cf-code{font-family:var(--dsh-code-font-family,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11.5px;line-height:1.55}
.dshg-cf-line{display:grid;grid-template-columns:34px minmax(0,1fr);min-width:0}
.dshg-cf-num{padding:0 6px;text-align:right;color:var(--dsw-alias-label-quaternary);user-select:none;font-variant-numeric:tabular-nums}
.dshg-cf-text{padding-right:4px;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}
.dshg-cf-ours .dshg-cf-line{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 6%,transparent)}
.dshg-cf-theirs .dshg-cf-line{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 6%,transparent)}
.dshg-cf-raw .dshg-cf-line:nth-child(odd){background:var(--dsw-alias-bg-layer-1)}

/* ---- file browser ---- */
.dshg-files-wrap{flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:row;overflow:hidden}
.dshg-files-wrap > .dshg-files{flex:1 1 55%;min-width:360px;max-width:calc(100% - 260px);border-right:0;overflow:auto}
.dshg-files-split{flex:none;width:6px;cursor:col-resize;background:var(--dsw-alias-border-l3);position:relative;z-index:1}
.dshg-files-split:hover,.dshg-files-split[data-drag=true]{background:var(--dsw-alias-state-business-primary)}
.dshg-filerow-on{background:var(--dsw-alias-interactive-bg-active);box-shadow:inset 2px 0 0 var(--dsw-alias-state-business-primary)}
.dshg-filepreview{flex:1 1 45%;min-width:260px}
.dshg-file-image{flex:1;min-height:0;overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:14px;background:var(--dsw-alias-bg-layer-2)}
.dshg-file-image img{max-width:100%;height:auto;border-radius:6px;box-shadow:0 4px 18px -6px rgba(0,0,0,.5)}
.dshg-file-text{flex:1;min-height:0;overflow:auto;font-family:var(--dsh-code-font-family,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11.5px;line-height:1.55}
.dshg-file-textline{display:grid;grid-template-columns:44px minmax(0,1fr);min-width:0}
.dshg-file-textline:hover{background:var(--dsw-alias-interactive-bg-hover)}
/* syntax highlight tokens */
.dshg-tok-comment{color:var(--dsw-alias-label-quaternary);font-style:italic}
.dshg-tok-string{color:var(--dsw-alias-state-success-primary)}
.dshg-tok-number{color:var(--dsw-alias-state-warn-primary)}
.dshg-tok-keyword{color:var(--dsw-alias-state-business-primary);font-weight:600}
.dshg-tok-type{color:#4ec9b0}
.dshg-tok-func{color:#dcdcaa}
/* fullscreen preview */
.dshg-fullmask{position:fixed;inset:0;z-index:9900;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:5vh 5vw}
.dshg-fullscreen{width:100%;height:90vh;max-width:1400px;display:flex;flex-direction:column;background-color:var(--dsw-alias-bg-base);background-image:linear-gradient(var(--dsw-alias-bg-layer-1),var(--dsw-alias-bg-layer-1));border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;overflow:hidden;box-shadow:0 24px 80px -20px rgba(0,0,0,.7)}
.dshg-textbtn{display:inline-flex;align-items:center;gap:5px;padding:0 8px;font:inherit;font-size:11px;line-height:1;white-space:nowrap;height:22px;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);cursor:pointer}
.dshg-textbtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshg-textbtn svg{width:12px;height:12px}
/* editor */
.dshg-editwin{background-image:linear-gradient(var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-2))}
.dshg-editor{flex:1 1 auto;min-height:0;width:100%;resize:none;border:0;outline:0;padding:14px 18px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsh-code-font-family,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:12.5px;line-height:1.6;tab-size:2}
.dshg-editfoot{flex:none;display:flex;align-items:center;gap:8px;padding:6px 12px;border-top:.5px solid var(--dsw-alias-border-l3);font-size:11px;color:var(--dsw-alias-label-quaternary)}
.dshg-dirty{font-size:11px;color:var(--dsw-alias-state-warn-primary)}
.dshg-savebtn{height:24px;padding:0 12px;flex:none;font-size:11px;gap:5px}
.dshg-files{flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.dshg-files-bar{flex:none;display:flex;align-items:center;gap:3px;padding:5px 8px;border-bottom:.5px solid var(--dsw-alias-border-l3);font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dshg-files-bar .dshg-mini svg{transform:rotate(90deg)}
.dshg-files-root,.dshg-files-crumb{cursor:pointer;padding:2px 4px;border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}
.dshg-files-root:hover,.dshg-files-crumb:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshg-files-root{color:var(--dsw-alias-state-business-primary);font-weight:500}
.dshg-files-sep{color:var(--dsw-alias-label-quaternary)}
.dshg-files-list{flex:1 1 auto;min-height:0;overflow:auto}
.dshg-filerow{display:flex;align-items:center;gap:8px;min-height:26px;padding:0 10px;cursor:pointer;font-size:12px;color:var(--dsw-alias-label-primary)}
.dshg-filerow:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshg-filerow:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dshg-fileicon{flex:none;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary)}
.dshg-fileicon svg{width:14px;height:14px}
.dshg-filerow:has(.dshg-fileicon svg path[d^="M2.7 2.7h8.6"]) .dshg-fileicon{color:var(--dsw-alias-state-warn-primary)}
.dshg-filename{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshg-filemeta{flex:none;font-size:10.5px;color:var(--dsw-alias-label-quaternary);font-variant-numeric:tabular-nums}
.dshg-filetime{flex:none;font-size:10.5px;color:var(--dsw-alias-label-quaternary);min-width:92px;text-align:right}
.dshg-history-path{padding:4px 10px;font-size:11px;color:var(--dsw-alias-label-tertiary);font-family:var(--dsh-code-font-family,ui-monospace,monospace);word-break:break-all;border-bottom:.5px solid var(--dsw-alias-border-l3)}

/* ---- terminal ---- */
.dshg-term{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base)}
.dshg-term-bar{flex:none;display:flex;align-items:center;gap:6px;padding:4px 8px;border-bottom:.5px solid var(--dsw-alias-border-l3);font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dshg-term-bar svg{width:12px;height:12px;flex:none}
.dshg-term-title{font-weight:600;color:var(--dsw-alias-label-secondary)}
.dshg-term-cwd{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;font-family:var(--dsh-code-font-family,ui-monospace,monospace);font-size:10.5px;color:var(--dsw-alias-label-quaternary)}
.dshg-term-log{flex:1 1 auto;min-height:0;overflow:auto;padding:6px 8px;font-family:var(--dsh-code-font-family,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11.5px;line-height:1.55;cursor:text}
.dshg-term-line{margin:0;white-space:pre-wrap;word-break:break-word;font:inherit}
.dshg-term-input{display:flex;gap:6px;align-items:flex-start;padding-top:4px}
.dshg-term-prompt{flex:none;color:var(--dsw-alias-state-business-primary);user-select:none}
.dshg-term-cmd{color:var(--dsw-alias-label-primary);word-break:break-all}
.dshg-term-output{color:var(--dsw-alias-label-secondary)}
.dshg-term-notice{color:var(--dsw-alias-label-quaternary);font-size:10.5px}
.dshg-term-error{color:var(--dsw-alias-state-error-primary);font-size:10.5px}
.dshg-term-suggest{flex:none;display:flex;gap:4px;padding:4px 8px;overflow-x:auto;border-top:.5px solid var(--dsw-alias-border-l3);scrollbar-width:none}
.dshg-term-suggest::-webkit-scrollbar{display:none}
.dshg-chip{flex:none;height:20px;padding:0 7px;border:.5px solid var(--dsw-alias-border-l2);border-radius:99px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary);font:inherit;font-size:10.5px;cursor:pointer;white-space:nowrap}
.dshg-chip:hover:not([disabled]){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-state-business-primary)}
.dshg-chip[disabled]{opacity:.45;cursor:default}
.dshg-term-inputrow{flex:none;display:flex;align-items:center;gap:6px;padding:6px 8px;border-top:.5px solid var(--dsw-alias-border-l3);${SURFACE_CSS}}
.dshg-term-field{flex:1;min-width:0;height:28px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsh-code-font-family,ui-monospace,monospace);font-size:11.5px;outline:none}
.dshg-term-field:focus{border-color:var(--dsw-alias-state-business-primary)}
.dshg-term-run{flex:none;width:auto;padding:0 12px;height:28px;font-size:12px}
`
