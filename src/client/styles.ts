/**
 * CSS for the SCM popup.
 *
 * Colours come from the host alias tokens only (`--dsw-alias-*`), so the panel
 * follows every theme/skin the way the official conversation surface does.
 * Everything is prefixed `dshg-` to stay collision-free with other plugins.
 */

export const CSS = `
.dshg-trigger{flex:none;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;line-height:1}
.dshg-trigger svg{width:15px;height:15px}
.dshg-trigger:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshg-trigger-on{background:var(--dsw-alias-interactive-bg-active);color:var(--dsw-alias-label-primary)}
.dshg-trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}

.dshg-root{font:inherit;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 18px 48px -12px rgba(0,0,0,.42),0 4px 14px -6px rgba(0,0,0,.28);overflow:hidden;height:auto;max-height:min(78vh,700px);min-height:0}

/* ---- header ---- */
.dshg-head{flex:none;display:flex;align-items:center;gap:8px;padding:9px 8px 8px 12px;border-bottom:.5px solid var(--dsw-alias-border-l3)}
.dshg-title{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;line-height:18px;white-space:nowrap;flex:none}
.dshg-title svg{width:14px;height:14px;color:var(--dsw-alias-label-secondary)}
.dshg-repo{min-width:0;font-size:12px;line-height:16px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:6px}
.dshg-branch{display:inline-flex;align-items:center;gap:4px;flex:none;height:20px;padding:0 7px;border-radius:99px;background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1}
.dshg-branch svg{width:11px;height:11px}
.dshg-ahead{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dshg-spacer{flex:1;min-width:4px}
.dshg-iconbtn{flex:none;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;line-height:1}
.dshg-iconbtn svg{width:15px;height:15px}
.dshg-iconbtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshg-iconbtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}
.dshg-iconbtn[disabled]{opacity:.45;cursor:default;background:transparent}
.dshg-iconbtn.dshg-spinning svg{animation:dshg-spin .8s linear infinite}
@keyframes dshg-spin{to{transform:rotate(360deg)}}

/* ---- commit box ---- */
.dshg-commit{flex:none;padding:10px 12px 9px;display:flex;flex-direction:column;gap:8px;border-bottom:.5px solid var(--dsw-alias-border-l3)}
.dshg-msg{box-sizing:border-box;width:100%;height:54px;min-height:42px;max-height:132px;resize:vertical;font:inherit;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 9px;outline:none}
.dshg-msg::placeholder{color:var(--dsw-alias-label-quaternary)}
.dshg-msg:focus{border-color:var(--dsw-alias-state-business-primary)}
.dshg-actions{display:flex;align-items:center;gap:8px}
.dshg-commitrow{display:flex;align-items:stretch;border-radius:7px;overflow:hidden;background:var(--dsw-alias-state-business-primary)}
.dshg-primary{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 12px;border:0;border-radius:0;font:inherit;font-size:12.5px;font-weight:500;color:var(--dsw-alias-label-primary-inverted);background:transparent;cursor:pointer;white-space:nowrap;flex:1;min-width:0}
.dshg-primary:hover{background:rgba(255,255,255,.1)}
.dshg-primary[disabled]{opacity:.5;cursor:default;background:transparent}
.dshg-primary svg{width:13px;height:13px}
.dshg-split{flex:none;width:28px;border:0;border-left:.5px solid rgba(0,0,0,.28);display:inline-flex;align-items:center;justify-content:center;background:transparent;color:var(--dsw-alias-label-primary-inverted);cursor:pointer;padding:0;line-height:1}
.dshg-split svg{width:13px;height:13px}
.dshg-split:hover{background:rgba(255,255,255,.12)}
.dshg-split[disabled]{opacity:.5;cursor:default;background:transparent}
.dshg-subrow{display:flex;align-items:center;gap:8px;min-height:14px}
.dshg-check{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--dsw-alias-label-tertiary);cursor:pointer;user-select:none}
.dshg-check input{accent-color:var(--dsw-alias-state-business-primary);margin:0;width:12px;height:12px}

/* ---- section list ---- */
.dshg-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.dshg-list{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable}
.dshg-list::-webkit-scrollbar{width:10px}
.dshg-list::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l1);border-radius:5px;border:2px solid transparent;background-clip:content-box}
.dshg-list::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l1);background-clip:content-box}
.dshg-section{display:flex;flex-direction:column}
.dshg-sechead{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:5px;padding:5px 8px 5px 4px;background:var(--dsw-alias-bg-layer-1);border-bottom:.5px solid var(--dsw-alias-border-l3);cursor:pointer;user-select:none}
.dshg-sechead:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshg-caret{flex:none;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);transition:transform .12s ease}
.dshg-caret svg{width:12px;height:12px}
.dshg-caret[data-open=false]{transform:rotate(-90deg)}
.dshg-sectitle{font-size:11px;font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-secondary)}
.dshg-count{min-width:16px;height:16px;padding:0 5px;display:inline-flex;align-items:center;justify-content:center;border-radius:99px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:1;font-variant-numeric:tabular-nums}
.dshg-secactions{margin-left:auto;display:flex;align-items:center;gap:2px}
.dshg-mini{width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:0;line-height:1}
.dshg-mini svg{width:13px;height:13px}
.dshg-mini:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshg-mini[disabled]{opacity:.4;cursor:default;background:transparent}

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
.dshg-letter-\\!{color:var(--dsw-alias-label-quaternary)}

/* ---- graph ---- */
.dshg-graph{flex:none}
.dshg-grow{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;height:24px;padding-right:8px;cursor:default;border:0;background:transparent;width:100%;text-align:left;font:inherit;color:inherit}
.dshg-grow:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshg-grow[data-head=true]{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 9%,transparent)}
.dshg-gsvg{flex:none;display:block;overflow:visible}
.dshg-gmeta{min-width:0;display:flex;align-items:center;gap:6px}
.dshg-gsubject{min-width:0;font-size:12px;line-height:22px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshg-gref{flex:none;max-width:120px;height:16px;padding:0 5px;display:inline-flex;align-items:center;border-radius:4px;font-size:10px;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 18%,transparent);color:var(--dsw-alias-state-business-primary);border:.5px solid color-mix(in srgb,var(--dsw-alias-state-business-primary) 36%,transparent)}
.dshg-gref[data-kind=tag]{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);border-color:var(--dsw-alias-border-l3)}
.dshg-gref[data-kind=remote]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 16%,transparent);color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 34%,transparent)}
.dshg-gside{flex:none;display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-quaternary);font-variant-numeric:tabular-nums}
.dshg-gsha{font-family:var(--dsh-code-font-family,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11px}

/* ---- diff viewer ---- */
.dshg-diff{flex:0 1 auto;border-top:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-base);max-height:48%;display:flex;flex-direction:column;min-height:120px}
.dshg-diffhead{flex:none;display:flex;align-items:center;gap:6px;padding:5px 8px;border-bottom:.5px solid var(--dsw-alias-border-l3);font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dshg-diffhead svg{width:12px;height:12px;flex:none}
.dshg-diffpath{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
.dshg-diffbody{flex:1;min-height:0;overflow:auto;font-family:var(--dsh-code-font-family,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11.5px;line-height:1.55}
.dshg-diffbody table{border-collapse:collapse;width:100%;table-layout:fixed}
.dshg-hunk{background:var(--dsw-alias-markdown-code-block-banner);color:var(--dsw-alias-label-tertiary)}
.dshg-hunk td{padding:2px 8px;font-size:11px;word-break:break-all}
.dshg-num{width:36px;min-width:36px;padding:0 5px;text-align:right;color:var(--dsw-alias-label-quaternary);user-select:none;vertical-align:top;font-variant-numeric:tabular-nums}
.dshg-code{padding:0 8px 0 2px;white-space:pre-wrap;word-break:break-word;vertical-align:top}
.dshg-ln-add{background:var(--dsw-alias-file-diff-added-bg)}
.dshg-ln-del{background:var(--dsw-alias-file-diff-deleted-bg)}
.dshg-ln-add .dshg-num{background:var(--dsw-alias-file-diff-added-gutter)}
.dshg-ln-del .dshg-num{background:var(--dsw-alias-file-diff-deleted-gutter)}
.dshg-diffempty{padding:14px;text-align:center;font-size:12px;color:var(--dsw-alias-label-tertiary);word-break:break-word}

/* ---- states ---- */
.dshg-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:34px 20px;text-align:center;color:var(--dsw-alias-label-tertiary)}
.dshg-empty svg{width:24px;height:24px;color:var(--dsw-alias-label-quaternary)}
.dshg-empty-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.dshg-empty-body{font-size:11.5px;line-height:1.6;max-width:34em}
.dshg-err{margin:8px 12px;padding:7px 10px;border-radius:8px;border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary);font-size:11.5px;line-height:1.5;word-break:break-word;max-height:96px;overflow:auto}
.dshg-loading{display:flex;align-items:center;justify-content:center;gap:8px;padding:26px;color:var(--dsw-alias-label-tertiary);font-size:12px}
.dshg-foot{flex:none;display:flex;align-items:center;gap:10px;padding:5px 10px;border-top:.5px solid var(--dsw-alias-border-l3);font-size:11px;color:var(--dsw-alias-label-quaternary);background:var(--dsw-alias-bg-layer-1);white-space:nowrap;overflow:hidden}
.dshg-foot b{font-weight:500;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
`
